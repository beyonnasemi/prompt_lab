-- 게시글 수동 정렬용 sort_order 컬럼과 전역 UI 설정용 app_settings 테이블 추가
-- Supabase Dashboard → SQL Editor 에서 전체를 한 번에 실행하세요.

-- 1) prompts.sort_order: 높을수록 위에 표시. 신규 글은 NOW() 기준 밀리초로 자동 할당.
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS sort_order BIGINT;

UPDATE prompts
SET sort_order = (EXTRACT(EPOCH FROM created_at) * 1000)::bigint
WHERE sort_order IS NULL;

ALTER TABLE prompts ALTER COLUMN sort_order SET NOT NULL;

ALTER TABLE prompts
ALTER COLUMN sort_order SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;

-- 성능: target_group + difficulty 필터 후 sort_order DESC 정렬
CREATE INDEX IF NOT EXISTS idx_prompts_target_difficulty_sort
  ON prompts (target_group, difficulty, sort_order DESC);

-- 2) app_settings: key/value 형태의 전역 UI 설정 저장소
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 등록일 표시 여부: 기본값 true(보임)
INSERT INTO app_settings (key, value)
VALUES ('show_created_at', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS: anon은 읽기만, 쓰기는 별도 정책으로 제한해도 되지만
-- 이 앱은 admin 식별을 localStorage로 하므로 anon write 도 허용한다(설정 토글 한정).
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_anon_read" ON app_settings;
CREATE POLICY "app_settings_anon_read" ON app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_settings_anon_write" ON app_settings;
CREATE POLICY "app_settings_anon_write" ON app_settings FOR ALL USING (true) WITH CHECK (true);
