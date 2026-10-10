import Link from "next/link";
import { Input, Label, Button } from "@/components/ui";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start free — connect your first form in minutes.
      </p>

      <form className="mt-7 space-y-4" action="/api/auth/sign-up" method="post">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@company.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-link font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
