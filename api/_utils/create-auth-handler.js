import { createVercelHandler } from "../../dist/vercel.js";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export function createAuthHandler(prefix) {
  return createVercelHandler(prefix);
}
