import { lazy, Suspense } from "react";
import { ClerkProvider, SignIn, SignUp, Show } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Memories = lazy(() => import("@/pages/memories"));
const MemoryForm = lazy(() => import("@/pages/memory-form"));
const ChatList = lazy(() => import("@/pages/chat-list"));
const ChatRoom = lazy(() => import("@/pages/chat-room"));
const SearchPage = lazy(() => import("@/pages/search"));
const FilesPage = lazy(() => import("@/pages/files"));

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(262 80% 50%)",
    colorForeground: "hsl(210 40% 98%)",
    colorMutedForeground: "hsl(215 20% 65%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(222 47% 11%)",
    colorInput: "hsl(217 33% 17%)",
    colorInputForeground: "hsl(210 40% 98%)",
    colorNeutral: "hsl(217 33% 17%)",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-background border border-border rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground text-xl font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/90",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground bg-background px-2",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-green-500",
    alertText: "text-destructive font-medium",
    logoBox: "flex justify-center",
    logoImage: "w-12 h-12 object-contain",
    socialButtonsBlockButton: "border border-border bg-transparent hover:bg-secondary/50",
    formButtonPrimary:
      "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm",
    formFieldInput:
      "bg-input border-border text-foreground focus:ring-primary focus:border-primary",
    footerAction: "flex items-center justify-center space-x-1",
    dividerLine: "bg-border",
    alert: "border border-destructive bg-destructive/10",
    otpCodeFieldInput: "bg-input border-border text-foreground",
    formFieldRow: "space-y-2",
    main: "w-full",
  },
};

function PageLoader() {
  return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-64 bg-secondary" />
      <Skeleton className="h-4 w-48 bg-secondary" />
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 bg-secondary rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function Home() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={`${basePath}/logo.svg`}
            alt="Second Brain logo"
            className="w-8 h-8"
          />
          <span className="font-bold text-foreground text-lg">Second Brain</span>
        </div>
        <div className="flex gap-3">
          <a
            href={`${basePath}/sign-in`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            data-testid="link-sign-in"
          >
            Sign in
          </a>
          <a
            href={`${basePath}/sign-up`}
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            data-testid="link-get-started"
          >
            Get started
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-8">
          AI-powered personal memory
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-foreground max-w-3xl leading-tight mb-6">
          Your second brain,{" "}
          <span className="text-primary">always remembers</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          Capture thoughts, notes, ideas, and learnings. Ask AI questions about your own mind. 
          Never lose a valuable insight again.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={`${basePath}/sign-up`}
            className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors"
            data-testid="link-cta-signup"
          >
            Start for free
          </a>
          <a
            href={`${basePath}/sign-in`}
            className="bg-secondary text-secondary-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-secondary/80 transition-colors border border-border"
          >
            Sign in
          </a>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full text-left">
          {[
            {
              title: "Capture everything",
              desc: "Save thoughts, notes, ideas, learnings, journal entries, and tasks in one place.",
            },
            {
              title: "Search with AI",
              desc: "Semantic search powered by Gemini understands context, not just keywords.",
            },
            {
              title: "Chat with your memory",
              desc: "Have a real conversation with an AI that knows everything you've stored.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-card border border-border rounded-xl p-6"
            >
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <div className="min-h-screen bg-background text-foreground">
          <Suspense fallback={<PageLoader />}>
            <Component />
          </Suspense>
        </div>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/memories/new">
        <ProtectedRoute component={MemoryForm} />
      </Route>
      <Route path="/memories/:id/edit">
        <ProtectedRoute component={MemoryForm} />
      </Route>
      <Route path="/memories">
        <ProtectedRoute component={Memories} />
      </Route>
      <Route path="/chat/:id">
        <ProtectedRoute component={ChatRoom} />
      </Route>
      <Route path="/chat">
        <ProtectedRoute component={ChatList} />
      </Route>
      <Route path="/search">
        <ProtectedRoute component={SearchPage} />
      </Route>
      <Route path="/files">
        <ProtectedRoute component={FilesPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen">
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function AppWrapper() {
  return (
    <WouterRouter base={basePath}>
      <App />
    </WouterRouter>
  );
}
