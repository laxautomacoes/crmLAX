import { Tables } from "./src/lib/supabase/database.types";

type Test = Tables<'ai_usage'>;

const foo: Test = {
    id: "1",
    created_at: null,
    model: null,
    total_tokens: null,
    feature_context: null,
    tenant_id: null,
    profile_id: null
};

console.log(foo);
