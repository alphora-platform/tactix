import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { signIn, signUp, signOut, type SignInPayload, type SignUpPayload } from '../lib/api/auth.api';
import { useAuthStore } from '../lib/store/auth.store';

export function useSignIn() {
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: SignInPayload) => signIn(payload),
    onSuccess: (user) => {
      setUser(user);
      router.navigate({ to: '/meta', replace: true });
    },
  });
}

export function useSignUp() {
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: SignUpPayload) => signUp(payload),
    onSuccess: (user) => {
      setUser(user);
      router.navigate({ to: '/meta', replace: true });
    },
  });
}

export function useSignOut() {
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      setUser(null);
      router.navigate({ to: '/sign-in', replace: true });
    },
  });
}
