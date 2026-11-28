import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { freeRefine } from "./free-refine";

const MODEL = "claude-opus-5-5";

/** Fixed instructions (kept identical between calls). */
const SYSTEM = `Tu aides la boutique « Bébé Dépôt » (dépôt-vente d'articles pour bébés et enfants, en Tunisie) à écrire les descriptions de ses produits.

On te donne la description tapée par la gérante. Réécris-la pour la fiche produit du site :
- corrige l'orthographe, la grammaire, la ponctuation et les accents ;
- rends-la claire, agréable et vendeuse, sur un ton chaleureux et simple ;
- garde TOUTES les informations données (marque, taille, âge, couleur, état, accessoires, défauts…) et n'invente rien : aucune marque, taille, matière ou qualité qui n'est pas dans le texte ;
- 1 à 4 phrases courtes, sans titre, sans liste, sans markdown, sans prix, au maximum un emoji ;
- écris en français ; si le texte est en arabe, réponds en arabe.

Réponds uniquement avec la nouvelle description, rien d'autre.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic | null = null;

  private getClient() {
    this.client ??= new Anthropic();
    return this.client;
  }

  /**
   * « Améliorer » : corrected description.
   *  - free (default, no key): spelling / grammar / punctuation fixes (LanguageTool) + tidy-up;
   *  - with ANTHROPIC_API_KEY in the .env: full rewrite by Claude (clearer, more appealing).
   */
  async refineDescription(input: { text: string; productName?: string; category?: string }): Promise<{ text: string; engine: "free" | "claude"; changes?: number }> {
    const text = input.text.trim();
    if (text.length < 3) throw new BadRequestException("Écrivez d'abord quelques mots de description.");
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      try {
        const r = await freeRefine(text);
        return { text: r.text, engine: "free", changes: r.changes };
      } catch (e) {
        this.logger.warn(`LanguageTool unreachable: ${(e as Error).message}`);
        throw new ServiceUnavailableException("Correction indisponible pour le moment (service gratuit saturé), réessayez dans une minute.");
      }
    }
    return this.refineWithClaude(text, input);
  }

  private async refineWithClaude(text: string, input: { productName?: string; category?: string }): Promise<{ text: string; engine: "claude" }> {
    const context = [input.productName?.trim() && `Produit : ${input.productName.trim()}`, input.category?.trim() && `Catégorie : ${input.category.trim()}`]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await this.getClient().beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        // Simple rewrite: low effort is enough and keeps it fast.
        output_config: { effort: "low" },
        // If the model declines, the API retries on a fallback model inside the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM,
        messages: [{ role: "user", content: `${context ? `${context}\n\n` : ""}Description à améliorer :\n${text}` }],
      });
      if (response.stop_reason === "refusal") {
        throw new BadRequestException("L'assistant n'a pas pu reformuler ce texte. Modifiez-le un peu et réessayez.");
      }
      const out = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim()
        .replace(/^["«»\s]+|["«»\s]+$/g, "");
      if (!out) throw new BadRequestException("Aucune proposition, réessayez.");
      return { text: out, engine: "claude" };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof ServiceUnavailableException) throw e;
      if (e instanceof Anthropic.AuthenticationError) {
        this.logger.error("ANTHROPIC_API_KEY rejected");
        throw new ServiceUnavailableException("Clé de l'assistant IA invalide (ANTHROPIC_API_KEY).");
      }
      if (e instanceof Anthropic.RateLimitError) throw new ServiceUnavailableException("Assistant IA très demandé, réessayez dans un instant.");
      if (e instanceof Anthropic.APIError) {
        this.logger.warn(`Claude API ${e.status}: ${e.message}`);
        throw new ServiceUnavailableException("Assistant IA indisponible pour le moment, réessayez.");
      }
      this.logger.warn(`Claude API unreachable: ${(e as Error).message}`);
      throw new ServiceUnavailableException("Assistant IA injoignable, vérifiez la connexion du serveur.");
    }
  }
}
