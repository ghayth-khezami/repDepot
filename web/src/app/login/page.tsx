"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { LogoLoader } from "@/components/LogoLoader";
import { safeRedirect } from "@/lib/safe-redirect";

export default function LoginPage() {
  const router = useRouter();
  const [redirectTo, setRedirectTo] = useState("/checkout");
  const [intent, setIntent] = useState<string | null>(null);
  const { login, register, verifyRegister, googleLogin, user, authHydrated } = useShop();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const title = useMemo(() => (mode === "signin" ? "Connexion" : "Créer un compte"), [mode]);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showVerify, setShowVerify] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(safeRedirect(params.get("redirect"), "/checkout"));
    setIntent(params.get("intent"));
  }, []);

  useEffect(() => {
    if (authHydrated && user) {
      router.replace(redirectTo);
    }
  }, [authHydrated, user, redirectTo, router]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
    if (!clientId || !googleBtnRef.current) return;

    const scriptId = "google-identity-services";
    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      setGoogleReady(true);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response.credential) {
            setError("Jeton Google manquant.");
            return;
          }
          setLoading(true);
          try {
            const signupIntent = intent === "deposer" ? "DEPOSER" : "CLIENT";
            await googleLogin(response.credential, signupIntent);
            toast.success("Connexion Google réussie");
            router.push(redirectTo);
          } catch {
            setError("Connexion Google impossible.");
            toast.error("Connexion Google impossible");
          } finally {
            setLoading(false);
          }
        },
      });
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        text: "continue_with",
        shape: "pill",
        size: "large",
        width: 320,
      });
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [googleLogin, intent, redirectTo, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "signup") {
        setLoading(true);
        await register(email, password, username || undefined);
        setShowVerify(true);
        toast.success("Code envoyé", {
          description: "Vérifiez votre boîte mail pour activer votre compte.",
        });
        return;
      }
      await login(email, password);
      toast.success("Connexion réussie");
      router.push(redirectTo);
    } catch {
      const msg =
        mode === "signin"
          ? "Identifiants invalides."
          : "Impossible d'envoyer le code (email déjà utilisé ?).";
      setError(msg);
      toast.error(mode === "signin" ? "Connexion impossible" : "Inscription impossible", {
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyRegister(email, code);
      setShowVerify(false);
      toast.success("Compte activé");
      router.push(redirectTo);
    } catch {
      setError("Code invalide ou expiré.");
      toast.error("Vérification impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LogoLoader visible={loading && mode === "signup"} />
      {showVerify && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-sm p-6">
            <p className="text-sm font-semibold text-foreground">Vérification email</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Code envoyé à <span className="font-medium">{email}</span>
            </p>
            <form onSubmit={onVerify} className="mt-4 space-y-3">
              <input
                className="field-input text-center text-lg tracking-[0.25em]"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                required
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                Vérifier
              </button>
              <button type="button" onClick={() => setShowVerify(false)} className="btn-ghost w-full">
                Fermer
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="login-page px-4 py-4 sm:px-6 md:py-6">
        <div className="login-shell mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-[#E04672]/10 bg-white/80 shadow-[0_24px_80px_rgba(224,70,114,0.14)] backdrop-blur-xl lg:grid-cols-2">
          <section className="login-baby-panel relative min-h-[34rem] overflow-hidden lg:min-h-[40rem]">
            <Image
              src="/bebe_depot_left_baby_panel.png"
              alt="Bébé dans un univers doux Bébé Dépôt"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
            />
          </section>

          <section className="login-form-panel p-6 sm:p-10 lg:p-12">
            <div className="flex items-center justify-between border-b border-[#E04672]/10">
              <button type="button" onClick={() => setMode("signin")} className={`unstyled login-tab ${mode === "signin" ? "login-tab-active" : ""}`}>Se connecter</button>
              <button type="button" onClick={() => setMode("signup")} className={`unstyled login-tab ${mode === "signup" ? "login-tab-active" : ""}`}>Créer un compte</button>
            </div>
            <div className="mt-8 max-w-md">
              <h1 className="font-display text-3xl text-[#2D2346] sm:text-4xl">{title === "Connexion" ? "Connexion à votre compte" : title}</h1>
              <p className="mt-2 text-sm text-[#2D2346]/60">{mode === "signin" ? "Entrez vos identifiants pour continuer" : "Créez votre compte pour commander simplement"}</p>
              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                {mode === "signup" && <input className="field-input" placeholder="Nom d'utilisateur (optionnel)" value={username} onChange={(e) => setUsername(e.target.value)} />}
                <label className="login-field"><Mail size={18} /><input type="email" placeholder="Adresse email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
                <label className="login-field"><LockKeyhole size={18} /><input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full !py-4">{mode === "signin" ? "Se connecter" : "S'inscrire"}</button>
                <div ref={googleBtnRef} className="flex min-h-11 justify-center empty:hidden" />
                {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() && !googleReady && <p className="text-center text-xs text-muted-foreground">Chargement Google…</p>}
              </form>
              <p className="mt-8 flex items-center justify-center gap-2 text-xs text-[#2D2346]/55"><ShieldCheck size={16} /> Vos données sont sécurisées et confidentielles</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
