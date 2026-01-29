// Load environment variables FIRST before anything else
// This file must be imported at the very top of any entry point
import dotenv from "dotenv";

dotenv.config();

// Re-export dotenv for convenience if needed elsewhere
export default dotenv;
