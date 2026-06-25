import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'onboarding-secret-key-123');

export async function signOnboardingToken(profileId: string) {
  return await new SignJWT({ profileId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(SECRET);
}

export async function verifyOnboardingToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.profileId as string;
  } catch (error) {
    console.error('❌ [JWT] Token verification failed:', error);
    return null;
  }
}
