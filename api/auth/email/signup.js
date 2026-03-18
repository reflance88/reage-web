import { config, createAuthHandler } from "../../_utils/create-auth-handler.js";

export { config };

export default createAuthHandler("/api/auth/email/signup");
