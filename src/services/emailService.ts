import logger from '../utils/logger';

export const sendVerificationEmail = async (email: string, token: string) => {
  logger.info(`Sending email verification to ${email} with token [${token}]`);
  // Integrate real ESP (AWS SES/Sendgrid) here
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  logger.info(`Sending password reset to ${email} with token [${token}]`);
  // Integrate real ESP (AWS SES/Sendgrid) here
};
