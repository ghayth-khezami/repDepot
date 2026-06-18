"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
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

      <div className="page-container py-8">
        <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] md:grid-cols-2">
          <div
            className="relative hidden flex-col justify-center p-10 md:flex"
            style={{ background: "var(--gradient-soft)" }}
          >
            <div className="flex items-center gap-3">
              <Image src="/depot.png" alt="Bébé Dépôt" width={54} height={54} className="rounded-full object-contain" />
              <div>
                <p className="tag-eyebrow text-[0.65rem]">Bébé Dépôt</p>
                <p className="text-xs text-muted-foreground">by Mme Khezami</p>
              </div>
            </div>
            <p className="display mt-8 text-3xl text-plum-deep">
              {mode === "signin" ? "Bon retour !" : "Bienvenue !"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Connectez-vous pour passer commande et suivre vos achats."
                : "Créez votre compte en quelques secondes."}
            </p>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="btn-ghost mt-6 w-fit"
            >
              {mode === "signin" ? "Créer un compte" : "J'ai déjà un compte"}
            </button>
          </div>

          <div className="p-6 md:p-10">
            <div className="mb-6 flex items-center justify-between md:hidden">
              <Image src="/depot.png" alt="" width={40} height={40} className="rounded-full object-contain" />
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="btn-ghost px-4 py-2 text-xs"
              >
                {mode === "signin" ? "Inscription" : "Connexion"}
              </button>
            </div>

            <h1 className="display text-3xl text-plum-deep">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Entrez vos informations pour continuer."
                : "Créez un compte pour commander."}
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              {mode === "signup" && (
                <input
                  className="field-input"
                  placeholder="Nom d'utilisateur (optionnel)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              )}
              <input
                className="field-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="field-input"
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {mode === "signin" ? "Se connecter" : "S'inscrire"}
              </button>
              <div ref={googleBtnRef} className="flex justify-center" />
              {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                <p className="text-center text-xs text-muted-foreground">
                  Configurez NEXT_PUBLIC_GOOGLE_CLIENT_ID pour Google.
                </p>
              ) : !googleReady ? (
                <p className="text-center text-xs text-muted-foreground">Chargement Google…</p>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
