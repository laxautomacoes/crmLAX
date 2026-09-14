CREATE TABLE viability_studies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    property_unit_id UUID REFERENCES property_units(id) ON DELETE SET NULL,
    title VARCHAR NOT NULL,
    builder_logo_url TEXT,
    property_logo_url TEXT,
    study_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE viability_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view studies from their tenant"
    ON viability_studies FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert studies for their tenant"
    ON viability_studies FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their tenant's studies"
    ON viability_studies FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their tenant's studies"
    ON viability_studies FOR DELETE
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- Triggers for updated_at
CREATE TRIGGER update_viability_studies_modtime
    BEFORE UPDATE ON viability_studies
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
