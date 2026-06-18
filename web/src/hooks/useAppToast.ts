"use client";

import { toast as sonnerToast } from "sonner";

export function useAppToast() {
  return {
    success: (title: string, description?: string) =>
      sonnerToast.success(title, description ? { description } : undefined),
    error: (title: string, description?: string) =>
      sonnerToast.error(title, description ? { description } : undefined),
    info: (title: string, description?: string) =>
      sonnerToast.info(title, description ? { description } : undefined),
    /** Présets français */
    addedToFavorites: () =>
      sonnerToast.success("Ajouté à la liste des produits préférés", {
        description: "Retrouvez-le dans Articles préférés.",
      }),
    removedFromFavorites: () =>
      sonnerToast.success("Retiré des favoris", {
        description: "Ce produit n’est plus dans Articles préférés.",
      }),
    loginRequiredForLike: () =>
      sonnerToast.error("Connexion requise", {
        description: "Connectez-vous pour enregistrer vos articles préférés.",
      }),
    addedToCart: (name?: string) =>
      sonnerToast.success("Ajouté au panier", {
        description: name ? `${name} est dans votre panier.` : "Le produit est dans votre panier.",
      }),
    welcomeBack: () =>
      sonnerToast.success("Connexion réussie", {
        description: "Bienvenue ! Vous pouvez continuer vos achats.",
      }),
    signupCodeSent: () =>
      sonnerToast.success("Code envoyé", {
        description: "Vérifiez votre boîte mail pour activer votre compte.",
      }),
    accountVerified: () =>
      sonnerToast.success("Compte activé", {
        description: "Votre compte est prêt. Bon shopping !",
      }),
  };
}
