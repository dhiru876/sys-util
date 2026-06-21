
// Helper function to check if SysUtil API should be used
// Set to false - we use user-provided API keys directly
export async function shouldUseSysUtilAPI(): Promise<boolean> {
  return false;
}
