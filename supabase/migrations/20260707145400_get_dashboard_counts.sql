-- Migration: get_dashboard_counts

CREATE OR REPLACE FUNCTION get_dashboard_counts(
    p_tenant_id uuid,
    p_user_id uuid DEFAULT NULL,
    p_start_curr timestamptz DEFAULT (now() - interval '30 days'),
    p_start_prev timestamptz DEFAULT (now() - interval '60 days')
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_leads integer;
    v_curr_leads integer;
    v_prev_leads integer;
    v_total_properties integer;
    v_curr_properties integer;
    v_prev_properties integer;
    v_funnel json;
BEGIN
    -- Leads Counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE created_at >= p_start_curr),
        COUNT(*) FILTER (WHERE created_at >= p_start_prev AND created_at < p_start_curr)
    INTO 
        v_total_leads, v_curr_leads, v_prev_leads
    FROM leads
    WHERE tenant_id = p_tenant_id 
    AND is_archived = false
    AND (p_user_id IS NULL OR assigned_to = p_user_id);

    -- Properties Counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE created_at >= p_start_curr),
        COUNT(*) FILTER (WHERE created_at >= p_start_prev AND created_at < p_start_curr)
    INTO 
        v_total_properties, v_curr_properties, v_prev_properties
    FROM properties
    WHERE tenant_id = p_tenant_id 
    AND is_archived = false;

    -- Funnel Counts
    SELECT json_object_agg(stage_id, count)
    INTO v_funnel
    FROM (
        SELECT stage_id, COUNT(*) as count
        FROM leads
        WHERE tenant_id = p_tenant_id 
        AND is_archived = false
        AND (p_user_id IS NULL OR assigned_to = p_user_id)
        GROUP BY stage_id
    ) as stage_counts;

    RETURN json_build_object(
        'leads', json_build_object(
            'total', COALESCE(v_total_leads, 0),
            'curr', COALESCE(v_curr_leads, 0),
            'prev', COALESCE(v_prev_leads, 0)
        ),
        'properties', json_build_object(
            'total', COALESCE(v_total_properties, 0),
            'curr', COALESCE(v_curr_properties, 0),
            'prev', COALESCE(v_prev_properties, 0)
        ),
        'funnel', COALESCE(v_funnel, '{}'::json)
    );
END;
$$;
