-- Função RPC para agendar próxima invocação do bulk-sender via pg_net
-- Usa vault secrets (mesmo padrão do cron process-followups)
CREATE OR REPLACE FUNCTION public.schedule_next_bulk_send(
  p_campaign_id UUID,
  p_delay_seconds INT DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'anon_key';

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING '[schedule_next_bulk_send] Vault secrets project_url ou anon_key não encontrados';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/bulk-sender',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('campaign_id', p_campaign_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron job de safety net: verifica campanhas em 'sending' travadas a cada 2 minutos
-- Se last_activity_at > 90s atrás, re-dispara a Edge Function via pg_net
SELECT cron.schedule(
  'bulk-sender-watchdog',
  '*/2 * * * *',
  $cron$
  DO $do$
  DECLARE
    v_campaign RECORD;
    v_url TEXT;
    v_key TEXT;
  BEGIN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'anon_key';

    IF v_url IS NULL OR v_key IS NULL THEN
      RETURN;
    END IF;

    FOR v_campaign IN
      SELECT id FROM bulk_campaigns
      WHERE status = 'sending'
        AND cancel_requested = false
        AND last_activity_at < NOW() - INTERVAL '90 seconds'
      LIMIT 3
    LOOP
      PERFORM net.http_post(
        url := v_url || '/functions/v1/bulk-sender',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object('campaign_id', v_campaign.id)
      );
    END LOOP;
  END;
  $do$;
  $cron$
);
