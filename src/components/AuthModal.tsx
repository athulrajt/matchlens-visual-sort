
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import AiLoader from "@/components/AiLoader";

const signUpSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type SignUpForm = z.infer<typeof signUpSchema>;
type SignInForm = z.infer<typeof signInSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onOpenChange, onSuccess }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [authView, setAuthView] = useState<'sign-in' | 'sign-up'>('sign-in');

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: '', email: '', password: '' },
  });

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSignUp = async (data: SignUpForm) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a confirmation link!");
      onSuccess?.();
    }
  };

  const handleSignIn = async (data: SignInForm) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed in successfully!");
      onSuccess?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card shadow-soft rounded-4xl border-none p-0">
        {authView === 'sign-in' ? (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Sign In</DialogTitle>
              <DialogDescription>
                Welcome back! Sign in to access your collections.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-in">Email</Label>
                  <Input id="email-in" placeholder="m@example.com" {...signInForm.register("email")} autoComplete="email" className="shadow-sm" />
                  {signInForm.formState.errors.email && <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-in">Password</Label>
                  <Input id="password-in" type="password" {...signInForm.register("password")} autoComplete="current-password" className="shadow-sm" />
                  {signInForm.formState.errors.password && <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-orange to-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity text-base py-3" disabled={loading}>
                  {loading ? <AiLoader className="w-6 h-6"/> : 'Sign In'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Button variant="link" className="p-0 h-auto font-medium text-primary" onClick={() => setAuthView('sign-up')}>
                  Create one
                </Button>
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Sign Up</DialogTitle>
              <DialogDescription>
                Create an account to start organizing your images.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" {...signUpForm.register("firstName")} autoComplete="given-name" className="shadow-sm" />
                   {signUpForm.formState.errors.firstName && <p className="text-sm text-destructive">{signUpForm.formState.errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" placeholder="m@example.com" {...signUpForm.register("email")} autoComplete="email" className="shadow-sm" />
                  {signUpForm.formState.errors.email && <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-up">Password</Label>
                  <Input id="password-up" type="password" {...signUpForm.register("password")} autoComplete="new-password" className="shadow-sm" />
                  {signUpForm.formState.errors.password && <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-orange to-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity text-base py-3" disabled={loading}>
                  {loading ? <AiLoader className="w-6 h-6"/> : 'Create Account'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button variant="link" className="p-0 h-auto font-medium text-primary" onClick={() => setAuthView('sign-in')}>
                  Sign in
                </Button>
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
