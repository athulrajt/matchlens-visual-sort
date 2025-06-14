
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
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

export default function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
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
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email!", {
        description: "We've sent a confirmation link to your email address.",
      });
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
      navigate("/");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Tabs defaultValue="sign-in" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sign-in">Sign In</TabsTrigger>
          <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="sign-in">
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Welcome back! Sign in to access your collections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-in">Email</Label>
                  <Input id="email-in" placeholder="m@example.com" {...signInForm.register("email")} />
                  {signInForm.formState.errors.email && <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-in">Password</Label>
                  <Input id="password-in" type="password" {...signInForm.register("password")} />
                  {signInForm.formState.errors.password && <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <AiLoader className="w-6 h-6"/> : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sign-up">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>
                Create an account to start organizing your images.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" {...signUpForm.register("firstName")} />
                   {signUpForm.formState.errors.firstName && <p className="text-sm text-destructive">{signUpForm.formState.errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" placeholder="m@example.com" {...signUpForm.register("email")} />
                  {signUpForm.formState.errors.email && <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-up">Password</Label>
                  <Input id="password-up" type="password" {...signUpForm.register("password")} />
                  {signUpForm.formState.errors.password && <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <AiLoader className="w-6 h-6"/> : 'Create Account'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
