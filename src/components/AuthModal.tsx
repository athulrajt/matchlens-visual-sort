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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      toast.success("Account created successfully!");
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
      <DialogContent className="sm:max-w-md bg-card/80 backdrop-blur-lg shadow-soft rounded-4xl border-none p-0">
          <Tabs defaultValue="sign-in" className="w-full">
            <TabsList className="flex w-full border-b bg-transparent p-0">
              <TabsTrigger value="sign-in" className="text-muted-foreground flex-grow basis-0 justify-center rounded-none rounded-tl-4xl px-3 py-4 text-sm font-medium transition-all data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-2px_0_hsl(var(--primary))]">Sign In</TabsTrigger>
              <TabsTrigger value="sign-up" className="text-muted-foreground flex-grow basis-0 justify-center rounded-none rounded-tr-4xl px-3 py-4 text-sm font-medium transition-all data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-2px_0_hsl(var(--primary))]">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="sign-in" className="p-6">
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
                      <Input id="email-in" placeholder="m@example.com" {...signInForm.register("email")} autoComplete="email" />
                      {signInForm.formState.errors.email && <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-in">Password</Label>
                      <Input id="password-in" type="password" {...signInForm.register("password")} autoComplete="current-password" />
                      {signInForm.formState.errors.password && <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>}
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-orange to-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity" disabled={loading}>
                      {loading ? <AiLoader className="w-6 h-6"/> : 'Sign In'}
                    </Button>
                  </form>
                </div>
            </TabsContent>
            <TabsContent value="sign-up" className="p-6">
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
                      <Input id="firstName" placeholder="John" {...signUpForm.register("firstName")} autoComplete="given-name" />
                       {signUpForm.formState.errors.firstName && <p className="text-sm text-destructive">{signUpForm.formState.errors.firstName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-up">Email</Label>
                      <Input id="email-up" placeholder="m@example.com" {...signUpForm.register("email")} autoComplete="email" />
                      {signUpForm.formState.errors.email && <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-up">Password</Label>
                      <Input id="password-up" type="password" {...signUpForm.register("password")} autoComplete="new-password" />
                      {signUpForm.formState.errors.password && <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>}
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-orange to-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity" disabled={loading}>
                      {loading ? <AiLoader className="w-6 h-6"/> : 'Create Account'}
                    </Button>
                  </form>
                </div>
            </TabsContent>
          </Tabs>
      </DialogContent>
    </Dialog>
  );
}
