import { createVercelHandler } from "../../dist/vercel.js";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default createVercelHandler("/api/trpc");
