-- =============================================================================
-- RAFIKI — Phase 1: Foundation
-- Migration: 20260213000001_phase1_foundation
-- Date: 2026-02-13
-- Description: Multi-tenant schema, 4-role auth, RLS policies, audit logging
-- Owner: Servicios Comerciales Rafiki, S.A. de C.V.
-- =============================================================================

-- -------------------------
-- SECTION 0: EXTENSIONS
-- -------------------------

-- pgcrypto is available by default in Supabase — used for gen_random_uuid()
-- No additional extensions required for Phase 1.


-- =============================================================================
-- SECTION 1: CUSTOM TYPES (ENUMS)
-- =============================================================================

-- User roles across the platform
CREATE TYPE user_role AS ENUM ('admin', 'organizador', 'vendedor', 'participante');

-- Lifecycle of an organization tenant
CREATE TYPE organization_status AS ENUM ('active', 'inactive', 'suspended');

-- Lifecycle of a sorteo campaign
CREATE TYPE sorteo_status AS ENUM ('draft', 'active', 'closed', 'drawn');

-- Status of an individual boleto
CREATE TYPE boleto_status AS ENUM ('available', 'sold');

-- How a sale was initiated
CREATE TYPE sale_channel AS ENUM ('vendedor', 'online', 'admin');

-- Payment confirmation state (Phase 6 will expand this)
CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'refunded');

-- Status of a vendedor's assignment to a sorteo
CREATE TYPE assignment_status AS ENUM ('active', 'removed');

-- Status of a user's role record
CREATE TYPE role_status AS ENUM ('active', 'inactive');


-- =============================================================================
-- SECTION 2: CORE TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- organizations
-- The tenant registry. Every Organizador is a row here.
-- Admin (SCR) manages this table. No tenant can see or touch another tenant.
-- -----------------------------------------------------------------------------
CREATE TABLE organizations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    -- URL-safe slug, used in public sorteo page URLs: rafiki.mx/itson/sorteos
    slug            text NOT NULL UNIQUE,
    status          organization_status NOT NULL DEFAULT 'active',
    contact_name    text,
    contact_email   text,
    contact_phone   text,
    -- Tenant-level config: role label overrides, branding, etc.
    -- Future use: {"vendedor_label": "colaborador", "primary_color": "#003366"}
    settings        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE organizations IS 'Tenant registry. Each row is one licensed client org (e.g., ITSON).';
COMMENT ON COLUMN organizations.slug IS 'URL-safe identifier used in public-facing routes. Immutable after first sorteo goes live.';
COMMENT ON COLUMN organizations.settings IS 'Tenant-level config bag. Phase 2+: role label overrides (colaborador vs vendedor), branding.';


-- -----------------------------------------------------------------------------
-- profiles
-- Extends auth.users with display info. 1:1 with auth.users.
-- Created automatically via trigger when a new user signs up.
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   text,
    phone       text,
    avatar_url  text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Extends auth.users. Created automatically by trigger on new signup. 1:1 with auth.users.';


-- -----------------------------------------------------------------------------
-- user_roles
-- The RBAC junction table. A user can have multiple roles (e.g., participante
-- in one org, vendedor in another). Each row is one role grant.
--
-- Rules:
-- - Admin row has organization_id = NULL (platform-wide)
-- - Vendedor/Organizador rows always have organization_id set
-- - Participante rows have organization_id = NULL (cross-tenant buyers)
-- - Unique constraint prevents duplicate role grants
-- -----------------------------------------------------------------------------
CREATE TABLE user_roles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    role            user_role NOT NULL,
    status          role_status NOT NULL DEFAULT 'active',
    invited_by      uuid REFERENCES profiles(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    -- A user can only have one active grant of a given role per org
    CONSTRAINT uq_user_role_per_org UNIQUE (user_id, organization_id, role)
);

COMMENT ON TABLE user_roles IS 'RBAC grants. One row per (user, role, org) combination. Admin has org=NULL. Participante has org=NULL.';
COMMENT ON COLUMN user_roles.organization_id IS 'NULL for admin (platform-wide) and participante (cross-tenant). Required for organizador and vendedor.';


-- -----------------------------------------------------------------------------
-- sorteos
-- The raffle campaigns. Core of the platform.
-- Tenant-isolated via organization_id + RLS.
-- -----------------------------------------------------------------------------
CREATE TABLE sorteos (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    title               text NOT NULL,
    description         text,
    -- Why this sorteo matters — displayed on public page for trust/engagement
    cause               text,
    total_boletos       integer NOT NULL CHECK (total_boletos > 0 AND total_boletos <= 500000),
    price_per_boleto    numeric(10,2) NOT NULL CHECK (price_per_boleto >= 0),
    start_date          timestamptz,
    end_date            timestamptz,
    drawing_date        timestamptz,
    status              sorteo_status NOT NULL DEFAULT 'draft',
    -- Mexican regulatory permit number (e.g., SEGOB: 20250250PS00)
    -- Displayed on public sorteo page for legal legitimacy
    permit_number       text,
    -- Immutable after set. Written by the auditable randomness engine (Phase 6).
    -- Structure: {"winners": [{"prize_position": 1, "boleto_numero": 12345, "buyer_name": "..."}]}
    drawing_result      jsonb,
    created_by          uuid REFERENCES profiles(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    -- Sales window sanity check
    CONSTRAINT chk_sorteo_dates CHECK (
        end_date IS NULL OR start_date IS NULL OR end_date > start_date
    )
);

COMMENT ON TABLE sorteos IS 'Raffle campaigns. Tenant-isolated. Status lifecycle: draft → active → closed → drawn.';
COMMENT ON COLUMN sorteos.cause IS 'Purpose messaging shown on public page, e.g. "funds student scholarships". Builds trust with buyers.';
COMMENT ON COLUMN sorteos.permit_number IS 'SEGOB or equivalent regulatory permit. Displayed publicly. ITSON uses e.g. 20250250PS00.';
COMMENT ON COLUMN sorteos.drawing_result IS 'Immutable after set by Phase 6 randomness engine. Never update this column directly.';
COMMENT ON COLUMN sorteos.total_boletos IS 'ITSON baseline: 40,000. Upper limit 500,000 (Sorteo Tec scale). Checked at boleto generation time.';


-- -----------------------------------------------------------------------------
-- prizes
-- Prize tiers per sorteo. ITSON has 5 tiers (Toyota Tacoma + $1.5M MXN, etc.)
-- organization_id is denormalized here so RLS doesn't require a join to sorteos.
-- -----------------------------------------------------------------------------
CREATE TABLE prizes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sorteo_id       uuid NOT NULL REFERENCES sorteos(id) ON DELETE CASCADE,
    -- Denormalized for RLS — avoids a join to sorteos in every policy check
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    -- 1 = first prize, 2 = second, etc. Unique per sorteo.
    position        integer NOT NULL CHECK (position > 0),
    title           text NOT NULL,
    description     text,
    value_mxn       numeric(12,2),
    image_url       text,
    -- Set by randomness engine at draw time (Phase 6). NULL until drawn.
    winning_boleto_id uuid,  -- FK added after boletos table is created below
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_prize_position_per_sorteo UNIQUE (sorteo_id, position)
);

COMMENT ON TABLE prizes IS 'Prize tiers per sorteo. ITSON standard: 5 tiers. position=1 is top prize.';
COMMENT ON COLUMN prizes.organization_id IS 'Denormalized from sorteos for RLS efficiency.';
COMMENT ON COLUMN prizes.winning_boleto_id IS 'Set by Phase 6 randomness engine. NULL until drawn. FK to boletos.';


-- -----------------------------------------------------------------------------
-- boletos
-- The ticket inventory. 40,000 rows per sorteo for ITSON.
-- Lean table by design — just identity + availability.
-- Buyer info lives in sales, not here. Keeps this table fast.
--
-- NEVER generated from the client. Always via generate_boletos() function.
-- NEVER deleted after generation. Status goes available → sold only.
-- -----------------------------------------------------------------------------
CREATE TABLE boletos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sorteo_id       uuid NOT NULL REFERENCES sorteos(id) ON DELETE RESTRICT,
    -- Denormalized for RLS
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    -- Sequential: 1 to total_boletos (confirmed by PM 2026-02-13)
    numero          integer NOT NULL CHECK (numero > 0),
    status          boleto_status NOT NULL DEFAULT 'available',
    created_at      timestamptz NOT NULL DEFAULT now(),
    -- One boleto number per sorteo — enforced at DB level
    CONSTRAINT uq_boleto_numero_per_sorteo UNIQUE (sorteo_id, numero)
);

COMMENT ON TABLE boletos IS '40K rows per sorteo. Lean: just identity + availability. Buyer info lives in sales. Pre-generated via generate_boletos().';
COMMENT ON COLUMN boletos.numero IS 'Sequential 1..total_boletos. Sequential confirmed by PM 2026-02-13. Never changed after creation.';
COMMENT ON COLUMN boletos.status IS 'Only transitions: available → sold (via claim_boleto()). Never deleted, never reset directly.';

-- Now add the FK from prizes to boletos (circular dependency resolved)
ALTER TABLE prizes
    ADD CONSTRAINT fk_prizes_winning_boleto
    FOREIGN KEY (winning_boleto_id) REFERENCES boletos(id);


-- -----------------------------------------------------------------------------
-- sales
-- Every sale transaction. Immutable records — never deleted.
-- The financial audit trail. boleto_numero is denormalized for resilience.
--
-- vendedor_id = NULL means online purchase (Phase 4+).
-- Always written via claim_boleto() function, never direct INSERT from client.
-- -----------------------------------------------------------------------------
CREATE TABLE sales (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sorteo_id       uuid NOT NULL REFERENCES sorteos(id) ON DELETE RESTRICT,
    -- Denormalized for RLS and fast reporting
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    boleto_id       uuid NOT NULL REFERENCES boletos(id) ON DELETE RESTRICT,
    -- Denormalized: survives any hypothetical boleto table restructure
    -- Also means CSV exports don't need a join
    boleto_numero   integer NOT NULL,
    -- Buyer info captured at point of sale
    buyer_name      text NOT NULL,
    buyer_phone     text NOT NULL,
    buyer_email     text,
    -- NULL = online purchase or admin entry (Phase 4+)
    vendedor_id     uuid REFERENCES profiles(id),
    sale_channel    sale_channel NOT NULL DEFAULT 'vendedor',
    -- Price locked at time of sale — sorteo price may change during campaign
    amount_mxn      numeric(10,2) NOT NULL,
    payment_status  payment_status NOT NULL DEFAULT 'pending',
    -- Vendedor notes (optional — e.g., "pagó con $500, cambio $200")
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    -- A boleto can only be sold once (redundant with boletos.status=sold, but
    -- belt-and-suspenders for the audit trail)
    CONSTRAINT uq_one_sale_per_boleto UNIQUE (boleto_id)
);

COMMENT ON TABLE sales IS 'Immutable financial audit trail. Every boleto sale. Never DELETE — use payment_status=refunded. Written via claim_boleto() only.';
COMMENT ON COLUMN sales.boleto_numero IS 'Denormalized from boletos.numero. CSV exports and reporting use this directly.';
COMMENT ON COLUMN sales.amount_mxn IS 'Price at time of sale. Locked in. sorteo.price_per_boleto may change; this record never does.';
COMMENT ON COLUMN sales.vendedor_id IS 'NULL for online purchases (Phase 4) and admin entries. Required for vendedor channel.';


-- -----------------------------------------------------------------------------
-- vendedor_assignments
-- Which vendedores are assigned to which sorteos.
-- An Organizador assigns/removes vendedores from their sorteos.
-- Vendedor can only sell boletos for sorteos where they have an active row here.
-- -----------------------------------------------------------------------------
CREATE TABLE vendedor_assignments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sorteo_id       uuid NOT NULL REFERENCES sorteos(id) ON DELETE CASCADE,
    -- Denormalized for RLS
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    assigned_by     uuid REFERENCES profiles(id),
    status          assignment_status NOT NULL DEFAULT 'active',
    assigned_at     timestamptz NOT NULL DEFAULT now(),
    -- A vendedor can only be assigned once per sorteo (re-assign just updates status)
    CONSTRAINT uq_vendedor_assignment UNIQUE (vendedor_id, sorteo_id)
);

COMMENT ON TABLE vendedor_assignments IS 'Vendedor→Sorteo assignments. Vendedores can only sell for sorteos they are actively assigned to.';


-- -----------------------------------------------------------------------------
-- audit_log
-- Append-only event log. Written ONLY by database triggers — never by client code.
-- Gives us a tamper-evident record of every significant action on the platform.
-- Admins and Organizadores can read their own tenant's log.
-- Nobody can UPDATE or DELETE rows here.
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- NULL for platform-level events (admin actions not tied to a tenant)
    organization_id uuid REFERENCES organizations(id),
    -- Namespaced event types: table.action
    -- Examples: sale.created, sorteo.status_changed, user.role_assigned, boleto.voided
    event_type      text NOT NULL,
    -- Who triggered this event (NULL for system-generated events)
    actor_id        uuid REFERENCES profiles(id),
    -- Which table was affected
    target_table    text NOT NULL,
    -- Primary key of the affected row
    target_id       uuid NOT NULL,
    -- Relevant before/after snapshot. Schema varies by event_type.
    payload         jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_log IS 'Append-only event log. Written by DB triggers only. No client INSERTs. No UPDATE/DELETE ever.';
COMMENT ON COLUMN audit_log.event_type IS 'Namespaced: table.action. E.g.: sale.created, sorteo.status_changed, user.role_assigned.';
COMMENT ON COLUMN audit_log.payload IS 'Before/after snapshot. Structure varies by event_type. See docs/schema.md for payload shapes.';


-- =============================================================================
-- SECTION 3: INDEXES
-- =============================================================================

-- organizations
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_slug ON organizations(slug); -- used in public URL routing

-- profiles
-- (id is PK — already indexed)

-- user_roles — primary access patterns
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_org_role ON user_roles(organization_id, role) WHERE status = 'active';
-- Used by get_my_role() and get_my_organization_id() on every authenticated request
CREATE INDEX idx_user_roles_user_active ON user_roles(user_id, status) WHERE status = 'active';

-- sorteos
CREATE INDEX idx_sorteos_org_status ON sorteos(organization_id, status);
-- Public browsing: active sorteos across all orgs (Phase 4)
CREATE INDEX idx_sorteos_status_public ON sorteos(status) WHERE status = 'active';

-- prizes
CREATE INDEX idx_prizes_sorteo ON prizes(sorteo_id);

-- boletos — these are the hot indexes for the vendedor flow
-- Primary availability query: "give me an available boleto for sorteo X"
CREATE INDEX idx_boletos_sorteo_status ON boletos(sorteo_id, status);
-- Primary lookup: "is boleto #1234 available for sorteo X?" — enforced UNIQUE above
-- Tenant isolation — used in RLS policy evaluation
CREATE INDEX idx_boletos_org ON boletos(organization_id);

-- sales — reporting and vendedor dashboard
CREATE INDEX idx_sales_sorteo_created ON sales(sorteo_id, created_at DESC);
CREATE INDEX idx_sales_vendedor_sorteo ON sales(vendedor_id, sorteo_id);
CREATE INDEX idx_sales_org_created ON sales(organization_id, created_at DESC);
-- Boleto lookup (should rarely be needed given uq_one_sale_per_boleto)
CREATE INDEX idx_sales_boleto ON sales(boleto_id);

-- vendedor_assignments
CREATE INDEX idx_assignments_vendedor ON vendedor_assignments(vendedor_id) WHERE status = 'active';
CREATE INDEX idx_assignments_sorteo ON vendedor_assignments(sorteo_id) WHERE status = 'active';

-- audit_log — always append; reads are admin/reporting only
CREATE INDEX idx_audit_log_org_created ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_log_target ON audit_log(target_table, target_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);


-- =============================================================================
-- SECTION 4: HELPER FUNCTIONS (used by RLS policies)
-- All SECURITY DEFINER to bypass RLS when called from within RLS policies,
-- preventing infinite recursion.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- get_my_role()
-- Returns the single highest-priority active role for the current user.
-- Priority: admin > organizador > vendedor > participante
--
-- TODO (Phase 4): Multi-role resolution needed for users who are both a
-- vendedor (for one org) and a participante (buying boletos cross-tenant).
-- When Phase 4 builds the participante purchase flow, revisit this function:
-- the correct approach is likely context-based role selection (e.g., pass
-- an explicit ?role= param in the session) rather than always returning the
-- highest-privilege role. Ticket: RAFIKI-PHASE4-MULTIROLE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role::text
    FROM user_roles
    WHERE user_id = auth.uid()
      AND status = 'active'
    ORDER BY CASE role
        WHEN 'admin'        THEN 1
        WHEN 'organizador'  THEN 2
        WHEN 'vendedor'     THEN 3
        WHEN 'participante' THEN 4
    END
    LIMIT 1;
$$;

COMMENT ON FUNCTION get_my_role() IS
    'Returns highest-priority active role for current user. Called by RLS policies — SECURITY DEFINER prevents recursion. TODO Phase 4: multi-role resolution for vendedor+participante users.';


-- -----------------------------------------------------------------------------
-- get_my_organization_id()
-- Returns the organization_id associated with the current user.
-- Returns NULL for admin (platform-wide) and participante (cross-tenant).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role NOT IN ('admin', 'participante')
    LIMIT 1;
$$;

COMMENT ON FUNCTION get_my_organization_id() IS
    'Returns organization_id for current user. NULL for admin/participante. Called by RLS policies — SECURITY DEFINER prevents recursion.';


-- -----------------------------------------------------------------------------
-- is_admin()
-- Fast boolean check used in RLS policies that grant admin full access.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_id = auth.uid()
          AND role = 'admin'
          AND status = 'active'
    );
$$;

COMMENT ON FUNCTION is_admin() IS
    'Returns true if current user has an active admin role. Used in RLS policies for admin bypass.';


-- -----------------------------------------------------------------------------
-- is_organizador_of(org_id)
-- Returns true if the current user is an active Organizador of the given org.
-- Used in RLS policies for Organizador write access.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_organizador_of(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_id = auth.uid()
          AND organization_id = p_organization_id
          AND role = 'organizador'
          AND status = 'active'
    );
$$;

COMMENT ON FUNCTION is_organizador_of(UUID) IS
    'Returns true if current user is an active organizador of the given org. Used in RLS write policies.';


-- -----------------------------------------------------------------------------
-- is_vendedor_of(org_id)
-- Returns true if the current user is an active Vendedor of the given org.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_vendedor_of(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_id = auth.uid()
          AND organization_id = p_organization_id
          AND role = 'vendedor'
          AND status = 'active'
    );
$$;

COMMENT ON FUNCTION is_vendedor_of(UUID) IS
    'Returns true if current user is an active vendedor of the given org.';


-- =============================================================================
-- SECTION 5: ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables. No exceptions.
ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorteos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE boletos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedor_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log              ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- organizations policies
-- =============================================================================

-- Admin: see all orgs
CREATE POLICY "organizations: admin sees all"
    ON organizations FOR SELECT
    USING (is_admin());

-- Organizador/Vendedor: see their own org only
CREATE POLICY "organizations: members see own org"
    ON organizations FOR SELECT
    USING (id = get_my_organization_id());

-- Admin: full write access
CREATE POLICY "organizations: admin insert"
    ON organizations FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "organizations: admin update"
    ON organizations FOR UPDATE
    USING (is_admin());

-- No DELETE on organizations — use status = 'suspended' instead
-- (No delete policy = delete is blocked for all users including admin via this RLS)


-- =============================================================================
-- profiles policies
-- =============================================================================

-- Users can always read and update their own profile
CREATE POLICY "profiles: read own"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "profiles: update own"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- Admin can read all profiles (needed for user management panel)
CREATE POLICY "profiles: admin reads all"
    ON profiles FOR SELECT
    USING (is_admin());

-- Organizador can read profiles of their vendedores (needed for dashboard)
CREATE POLICY "profiles: organizador reads org members"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = profiles.id
              AND ur.organization_id = get_my_organization_id()
              AND ur.status = 'active'
        )
        AND is_organizador_of(get_my_organization_id())
    );

-- New user signup: insert their own profile (called by the signup trigger)
CREATE POLICY "profiles: insert own on signup"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());


-- =============================================================================
-- user_roles policies
-- =============================================================================

-- Users can always see their own role grants
CREATE POLICY "user_roles: read own"
    ON user_roles FOR SELECT
    USING (user_id = auth.uid());

-- Admin: full access
CREATE POLICY "user_roles: admin sees all"
    ON user_roles FOR SELECT
    USING (is_admin());

CREATE POLICY "user_roles: admin insert"
    ON user_roles FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "user_roles: admin update"
    ON user_roles FOR UPDATE
    USING (is_admin());

-- Organizador: can read roles within their org (see their vendedores)
CREATE POLICY "user_roles: organizador reads own org"
    ON user_roles FOR SELECT
    USING (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

-- Organizador: can grant/revoke vendedor roles within their own org
-- Cannot grant organizador or admin roles — enforced by the role check
CREATE POLICY "user_roles: organizador manages vendedores"
    ON user_roles FOR INSERT
    WITH CHECK (
        role = 'vendedor'
        AND organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

CREATE POLICY "user_roles: organizador updates vendedores"
    ON user_roles FOR UPDATE
    USING (
        role = 'vendedor'
        AND organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );


-- =============================================================================
-- sorteos policies
-- =============================================================================

-- Public: anyone (including unauthenticated) can see active sorteos
-- This is intentional — public sorteo pages don't require login
CREATE POLICY "sorteos: public active sorteos"
    ON sorteos FOR SELECT
    USING (status = 'active');

-- Admin: see all sorteos
CREATE POLICY "sorteos: admin sees all"
    ON sorteos FOR SELECT
    USING (is_admin());

-- Organizador + Vendedor: see all sorteos in their org (including drafts)
CREATE POLICY "sorteos: org members see own org"
    ON sorteos FOR SELECT
    USING (organization_id = get_my_organization_id());

-- Organizador: create and edit sorteos within their org
CREATE POLICY "sorteos: organizador insert"
    ON sorteos FOR INSERT
    WITH CHECK (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

CREATE POLICY "sorteos: organizador update"
    ON sorteos FOR UPDATE
    USING (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

-- Admin: can update any sorteo (platform management)
CREATE POLICY "sorteos: admin update"
    ON sorteos FOR UPDATE
    USING (is_admin());


-- =============================================================================
-- prizes policies
-- =============================================================================

-- Public: prizes for active sorteos are public
CREATE POLICY "prizes: public for active sorteos"
    ON prizes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sorteos s
            WHERE s.id = prizes.sorteo_id
              AND s.status = 'active'
        )
    );

-- Admin: see all
CREATE POLICY "prizes: admin sees all"
    ON prizes FOR SELECT
    USING (is_admin());

-- Org members: see prizes for their org's sorteos
CREATE POLICY "prizes: org members see own"
    ON prizes FOR SELECT
    USING (organization_id = get_my_organization_id());

-- Organizador: manage prizes for their sorteos
CREATE POLICY "prizes: organizador insert"
    ON prizes FOR INSERT
    WITH CHECK (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

CREATE POLICY "prizes: organizador update"
    ON prizes FOR UPDATE
    USING (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

CREATE POLICY "prizes: organizador delete"
    ON prizes FOR DELETE
    USING (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );


-- =============================================================================
-- boletos policies
-- NOTE: Direct client INSERT to boletos is intentionally not permitted.
-- Boleto generation goes exclusively through generate_boletos() (SECURITY DEFINER).
-- Direct client UPDATE is also not permitted — claim_boleto() handles all status changes.
-- =============================================================================

-- Vendedor: see available and sold boletos for their assigned sorteos
CREATE POLICY "boletos: vendedor sees assigned sorteos"
    ON boletos FOR SELECT
    USING (
        organization_id = get_my_organization_id()
        AND is_vendedor_of(get_my_organization_id())
        AND EXISTS (
            SELECT 1 FROM vendedor_assignments va
            WHERE va.sorteo_id = boletos.sorteo_id
              AND va.vendedor_id = auth.uid()
              AND va.status = 'active'
        )
    );

-- Organizador: see all boletos in their org
CREATE POLICY "boletos: organizador sees own org"
    ON boletos FOR SELECT
    USING (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

-- Admin: see all
CREATE POLICY "boletos: admin sees all"
    ON boletos FOR SELECT
    USING (is_admin());

-- Participante / public: see available boletos on active sorteos (for browsing — Phase 4)
CREATE POLICY "boletos: public sees available on active sorteos"
    ON boletos FOR SELECT
    USING (
        status = 'available'
        AND EXISTS (
            SELECT 1 FROM sorteos s
            WHERE s.id = boletos.sorteo_id
              AND s.status = 'active'
        )
    );


-- =============================================================================
-- sales policies
-- NOTE: Direct client INSERT to sales is not permitted.
-- All sales go through claim_boleto() (SECURITY DEFINER).
-- Only payment_status can be updated, and only by admin/organizador.
-- =============================================================================

-- Admin: see all sales
CREATE POLICY "sales: admin sees all"
    ON sales FOR SELECT
    USING (is_admin());

-- Organizador: see all sales in their org
CREATE POLICY "sales: organizador sees own org"
    ON sales FOR SELECT
    USING (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

-- Vendedor: see only their own sales
CREATE POLICY "sales: vendedor sees own sales"
    ON sales FOR SELECT
    USING (
        vendedor_id = auth.uid()
        AND is_vendedor_of(get_my_organization_id())
    );

-- Admin + Organizador: can update payment_status (confirm cash receipt)
-- No other column should be changed. Application enforces this; DB provides the surface.
CREATE POLICY "sales: organizador update payment status"
    ON sales FOR UPDATE
    USING (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

CREATE POLICY "sales: admin update"
    ON sales FOR UPDATE
    USING (is_admin());


-- =============================================================================
-- vendedor_assignments policies
-- =============================================================================

-- Admin: see all
CREATE POLICY "assignments: admin sees all"
    ON vendedor_assignments FOR SELECT
    USING (is_admin());

-- Organizador: see assignments within their org
CREATE POLICY "assignments: organizador sees own org"
    ON vendedor_assignments FOR SELECT
    USING (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

-- Vendedor: see their own assignments
CREATE POLICY "assignments: vendedor sees own"
    ON vendedor_assignments FOR SELECT
    USING (vendedor_id = auth.uid());

-- Organizador: assign and remove vendedores from their sorteos
CREATE POLICY "assignments: organizador insert"
    ON vendedor_assignments FOR INSERT
    WITH CHECK (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

CREATE POLICY "assignments: organizador update"
    ON vendedor_assignments FOR UPDATE
    USING (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );


-- =============================================================================
-- audit_log policies
-- INSERT is blocked for all authenticated users — only triggers write here.
-- That's enforced by not having an INSERT policy (default deny).
-- =============================================================================

-- Admin: see all audit events
CREATE POLICY "audit_log: admin sees all"
    ON audit_log FOR SELECT
    USING (is_admin());

-- Organizador: see their org's audit events
CREATE POLICY "audit_log: organizador sees own org"
    ON audit_log FOR SELECT
    USING (
        organization_id = get_my_organization_id()
        AND is_organizador_of(get_my_organization_id())
    );

-- No INSERT policy = no direct inserts from any client. Triggers only.
-- No UPDATE policy = immutable records.
-- No DELETE policy = can never be deleted.


-- =============================================================================
-- SECTION 6: TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Trigger: auto-create profile on new auth.users row
-- Fires when a new user signs up via Supabase Auth.
-- Creates the corresponding profiles row so RLS policies have something to join.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'phone'
    )
    ON CONFLICT (id) DO NOTHING; -- idempotent
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user() IS
    'Auto-creates profiles row on new auth.users INSERT. Reads full_name and phone from signup metadata.';


-- -----------------------------------------------------------------------------
-- Trigger: update updated_at on row change
-- Applied to all tables that have an updated_at column.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER touch_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER touch_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER touch_sorteos_updated_at
    BEFORE UPDATE ON sorteos
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER touch_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- -----------------------------------------------------------------------------
-- Trigger: write to audit_log on sale creation
-- Every new sale row gets an audit event automatically.
-- This cannot be bypassed by application code.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_sale_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO audit_log (
        organization_id,
        event_type,
        actor_id,
        target_table,
        target_id,
        payload
    ) VALUES (
        NEW.organization_id,
        'sale.created',
        NEW.vendedor_id,  -- NULL for online/admin sales
        'sales',
        NEW.id,
        jsonb_build_object(
            'sorteo_id',     NEW.sorteo_id,
            'boleto_id',     NEW.boleto_id,
            'boleto_numero', NEW.boleto_numero,
            'buyer_name',    NEW.buyer_name,
            'buyer_phone',   NEW.buyer_phone,
            'amount_mxn',    NEW.amount_mxn,
            'sale_channel',  NEW.sale_channel,
            'vendedor_id',   NEW.vendedor_id
        )
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_sale_created
    AFTER INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION audit_sale_created();

COMMENT ON FUNCTION audit_sale_created() IS
    'Appends to audit_log on every new sale. Cannot be bypassed. Payload captures full sale context for reconciliation.';


-- -----------------------------------------------------------------------------
-- Trigger: write to audit_log on sorteo status change
-- Captures the before and after status so we have a complete state history.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_sorteo_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_log (
            organization_id,
            event_type,
            actor_id,
            target_table,
            target_id,
            payload
        ) VALUES (
            NEW.organization_id,
            'sorteo.status_changed',
            auth.uid(),
            'sorteos',
            NEW.id,
            jsonb_build_object(
                'from_status', OLD.status,
                'to_status',   NEW.status,
                'title',       NEW.title
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_sorteo_status_changed
    AFTER UPDATE ON sorteos
    FOR EACH ROW
    EXECUTE FUNCTION audit_sorteo_status_changed();


-- =============================================================================
-- SECTION 7: CORE DATABASE FUNCTIONS
-- These are called by the application (via Supabase RPC) and by the Edge Function.
-- All write operations go through these — no direct table mutation from client.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- generate_boletos(sorteo_id, organization_id, total)
-- Pre-generates all boleto rows for a sorteo in a single server-side call.
-- Called by the generate-boletos Edge Function immediately after sorteo creation.
-- Uses generate_series for near-instant bulk insert (40K rows ~200ms).
--
-- Cannot be called if boletos already exist for this sorteo (idempotency guard).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_boletos(
    p_sorteo_id       UUID,
    p_organization_id UUID,
    p_total           INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_count INTEGER;
    v_sorteo_org_id  UUID;
BEGIN
    -- Verify the sorteo belongs to the claimed organization
    SELECT organization_id INTO v_sorteo_org_id
    FROM sorteos
    WHERE id = p_sorteo_id;

    IF v_sorteo_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_found');
    END IF;

    IF v_sorteo_org_id != p_organization_id THEN
        RETURN jsonb_build_object('success', false, 'reason', 'org_mismatch');
    END IF;

    -- Idempotency guard: don't generate twice
    SELECT COUNT(*) INTO v_existing_count
    FROM boletos
    WHERE sorteo_id = p_sorteo_id;

    IF v_existing_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'already_generated',
            'existing_count', v_existing_count
        );
    END IF;

    -- Bulk insert via generate_series — single operation, ~200ms for 40K rows
    INSERT INTO boletos (sorteo_id, organization_id, numero, status)
    SELECT p_sorteo_id, p_organization_id, n, 'available'
    FROM generate_series(1, p_total) AS n;

    -- Log the generation event
    INSERT INTO audit_log (
        organization_id, event_type, actor_id, target_table, target_id, payload
    ) VALUES (
        p_organization_id,
        'boletos.generated',
        auth.uid(),
        'sorteos',
        p_sorteo_id,
        jsonb_build_object('total_generated', p_total)
    );

    RETURN jsonb_build_object('success', true, 'generated', p_total);
END;
$$;

COMMENT ON FUNCTION generate_boletos(UUID, UUID, INTEGER) IS
    'Bulk-generates boleto rows via generate_series. Call once per sorteo. Idempotent (returns error if called again). ~200ms for 40K rows.';


-- -----------------------------------------------------------------------------
-- claim_boleto(sorteo_id, numero, vendedor_id, buyer_name, buyer_phone, buyer_email)
-- The atomic heart of the vendedor sales flow.
-- Marks the boleto as sold and creates the sale record in a single transaction.
-- Uses UPDATE...RETURNING to detect races — only one transaction wins.
--
-- Returns:
--   {success: true, sale_id: "...", boleto_numero: 12345}
--   {success: false, reason: "boleto_unavailable"} if already sold
--   {success: false, reason: "sorteo_not_found"}
--   {success: false, reason: "vendedor_not_assigned"}
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_boleto(
    p_sorteo_id     UUID,
    p_numero        INTEGER,
    p_vendedor_id   UUID,
    p_buyer_name    TEXT,
    p_buyer_phone   TEXT,
    p_buyer_email   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_boleto_id      UUID;
    v_sale_id        UUID;
    v_org_id         UUID;
    v_price          NUMERIC(10,2);
    v_sorteo_status  sorteo_status;
    v_is_assigned    BOOLEAN;
BEGIN
    -- Fetch sorteo context
    SELECT organization_id, price_per_boleto, status
    INTO v_org_id, v_price, v_sorteo_status
    FROM sorteos
    WHERE id = p_sorteo_id;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_found');
    END IF;

    IF v_sorteo_status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_active', 'status', v_sorteo_status);
    END IF;

    -- Verify the vendedor is assigned to this sorteo
    SELECT EXISTS (
        SELECT 1 FROM vendedor_assignments
        WHERE vendedor_id = p_vendedor_id
          AND sorteo_id = p_sorteo_id
          AND status = 'active'
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
        RETURN jsonb_build_object('success', false, 'reason', 'vendedor_not_assigned');
    END IF;

    -- Atomic claim: UPDATE only succeeds for one transaction when multiple race
    -- UPDATE...WHERE status = 'available' is the race condition guard
    UPDATE boletos
    SET status = 'sold'
    WHERE sorteo_id = p_sorteo_id
      AND numero = p_numero
      AND status = 'available'
    RETURNING id INTO v_boleto_id;

    -- If no row was updated, the boleto doesn't exist or was already sold
    IF v_boleto_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'boleto_unavailable');
    END IF;

    -- Record the sale (audit trigger fires automatically after this INSERT)
    INSERT INTO sales (
        sorteo_id, organization_id, boleto_id, boleto_numero,
        buyer_name, buyer_phone, buyer_email,
        vendedor_id, sale_channel, amount_mxn, payment_status
    ) VALUES (
        p_sorteo_id, v_org_id, v_boleto_id, p_numero,
        p_buyer_name, p_buyer_phone, p_buyer_email,
        p_vendedor_id, 'vendedor', v_price, 'pending'
    )
    RETURNING id INTO v_sale_id;

    RETURN jsonb_build_object(
        'success',       true,
        'sale_id',       v_sale_id,
        'boleto_numero', p_numero,
        'amount_mxn',    v_price
    );
END;
$$;

COMMENT ON FUNCTION claim_boleto(UUID, INTEGER, UUID, TEXT, TEXT, TEXT) IS
    'Atomic boleto claim + sale creation. Race-safe via UPDATE...WHERE status=available. Called exclusively by vendedor flow. Audit trigger fires automatically.';


-- -----------------------------------------------------------------------------
-- get_next_available_boleto(sorteo_id)
-- Returns the lowest available boleto number for quick-select ("siguiente disponible").
-- Called by vendedor UI when buyer doesn't care about specific number.
-- Does NOT claim the boleto — caller must follow with claim_boleto().
-- The brief window between this call and claim_boleto() is acceptable:
-- if the number is taken by the time claim_boleto() runs, claim returns
-- boleto_unavailable and the UI re-calls this function.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_next_available_boleto(p_sorteo_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT numero
    FROM boletos
    WHERE sorteo_id = p_sorteo_id
      AND status = 'available'
    ORDER BY numero
    LIMIT 1;
$$;

COMMENT ON FUNCTION get_next_available_boleto(UUID) IS
    'Returns lowest available boleto numero. Does NOT claim it. Vendedor flow: call this, then immediately call claim_boleto(). On race, UI retries.';


-- =============================================================================
-- SECTION 8: INITIAL SEED DATA
-- Creates the Rafiki platform admin organization and a placeholder admin role row.
-- The actual auth.users row for admin is created manually in Supabase dashboard.
-- =============================================================================

-- Insert the platform owner organization
-- This org represents Servicios Comerciales Rafiki, S.A. de C.V.
INSERT INTO organizations (id, name, slug, status, contact_name, contact_email)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Servicios Comerciales Rafiki',
    'rafiki',
    'active',
    'Sergio Guzmán',
    'sergio@rafiki.mx'
);

COMMENT ON TABLE organizations IS 'Tenant registry. Row 00000000-0000-0000-0000-000000000001 is SCR (platform owner). Never delete.';


-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Tables:     organizations, profiles, user_roles, sorteos, prizes,
--             boletos, sales, vendedor_assignments, audit_log
-- Functions:  get_my_role(), get_my_organization_id(), is_admin(),
--             is_organizador_of(), is_vendedor_of(),
--             generate_boletos(), claim_boleto(), get_next_available_boleto()
-- Triggers:   handle_new_user, touch_*_updated_at,
--             audit_sale_created, audit_sorteo_status_changed
-- Seed:       SCR platform organization row
--
-- Next: Run supabase/functions/generate-boletos/index.ts for boleto generation
-- Changelog: docs/schema.md
-- =============================================================================
