/**
 * Utility functions for protecting client privacy
 */

/**
 * Masks client's last name, showing only first name and last initial
 * @param fullName - The full name of the client
 * @returns Masked name in format "FirstName L."
 */
export function maskClientName(fullName: string | null | undefined): string {
  if (!fullName || typeof fullName !== 'string') {
    return 'Unknown Client';
  }
  
  const nameParts = fullName.trim().split(' ');
  if (nameParts.length === 0) {
    return 'Unknown Client';
  }
  
  if (nameParts.length === 1) {
    return nameParts[0];
  }
  
  const firstName = nameParts[0];
  const lastInitial = nameParts[nameParts.length - 1][0]?.toUpperCase();
  
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

/**
 * Determines if contact information should be shown based on user role
 * @param userRole - The role of the current user
 * @returns True if contact info should be shown
 */
export function shouldShowContactInfo(userRole: string | null | undefined): boolean {
  return userRole === 'admin';
}

/**
 * Gets the appropriate client name based on user role
 * @param fullName - The full name of the client
 * @param userRole - The role of the current user
 * @returns Full name for admins, masked name for others
 */
export function getClientNameForRole(
  fullName: string | null | undefined, 
  userRole: string | null | undefined
): string {
  if (shouldShowContactInfo(userRole)) {
    return fullName || 'Unknown Client';
  }
  return maskClientName(fullName);
}