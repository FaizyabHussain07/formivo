import Link from "next/link";
import { Input, Label, Button } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Sign in to Formivo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back — your leads are waiting.
      </p>

      <form className="mt-7 space-y-4" action="/api/auth/sign-in" method="post">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
          Forgot password?
        </Link>
        <Link href="/sign-up" className="text-link font-medium hover:underline">
          Create account
        </Link>
      </div>
    </div>
  );
}
