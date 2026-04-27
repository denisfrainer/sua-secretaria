/**
 * MENU HANDLER - Finite State Machine (FSM)
 * ==========================================
 * Pure, deterministic function that handles WhatsApp menu routing.
 * This module is completely isolated from the AI logic (Eliza Worker).
 *
 * State Map:
 *   Step 0  → New Lead. Show greeting + menu options.
 *   Step 1  → Waiting for user to pick an option (1 or 2).
 *   Step 99 → Terminal / AI-passthrough state.
 *
 * IMPORTANT: This is a PURE FUNCTION. It has zero side effects.
 * It does NOT send messages, does NOT touch the database.
 * The caller (router) is responsible for persisting state and dispatching messages.
 */

// ==============================================================
// TYPES
// ==============================================================

export interface MenuResult {
  /** The text reply to send back to the user. Null when useAI is true. */
  reply: string | null;
  /** The next step to persist in `leads_lobo.menu_step`. */
  nextStep: number;
  /** If true, the router should bypass this handler and invoke the Eliza LLM. */
  useAI: boolean;
}

// ==============================================================
// CONSTANTS
// ==============================================================

const SITE_URL = 'https://sua-secretaria.netlify.app';

// ==============================================================
// STATE MACHINE
// ==============================================================

/**
 * Processes the current menu state for an incoming WhatsApp message.
 *
 * @param currentStep - The user's current position in the menu flow (from DB).
 * @param incomingText - The raw text message sent by the user.
 * @param businessSlug - The business's unique slug for generating the booking link.
 * @returns MenuResult - The deterministic response: reply text, next step, and AI flag.
 */
export function processMenuState(
  currentStep: number,
  incomingText: string,
  businessSlug: string
): MenuResult {
  const text = incomingText.trim();

  switch (currentStep) {
    // ----------------------------------------------------------
    // STEP 0: First Contact / New Lead
    // Greeting + present the menu options.
    // ----------------------------------------------------------
    case 0: {
      const greeting = [
        `Olá! 👋 Sou o assistente virtual da *Belezap*.`,
        `Como posso te ajudar hoje?\n`,
        `1️⃣ - Agendar Horário`,
        `2️⃣ - Falar com um Atendente`,
      ].join('\n');

      return {
        reply: greeting,
        nextStep: 1,
        useAI: false,
      };
    }

    // ----------------------------------------------------------
    // STEP 1: Waiting for Option Selection
    // Strict matching: only "1" or "2" are valid inputs.
    // ----------------------------------------------------------
    case 1: {
      if (text === '1') {
        const bookingUrl = `${SITE_URL}/${businessSlug}`;
        return {
          reply: `✅ Aqui está o link para você agendar seu horário:\n\n👉 ${bookingUrl}\n\nÉ rápido e fácil! Qualquer dúvida, é só me chamar. 😊`,
          nextStep: 99,
          useAI: false,
        };
      }

      if (text === '2') {
        return {
          reply: `Certo! 🙋 Um atendente humano vai te responder em breve.\n\nAguarde um momento, por favor.`,
          nextStep: 99,
          useAI: false,
        };
      }

      // Invalid option — keep the user in step 1
      return {
        reply: `❌ Opção inválida. Por favor, digite *1* ou *2*.\n\n1️⃣ - Agendar Horário\n2️⃣ - Falar com um Atendente`,
        nextStep: 1,
        useAI: false,
      };
    }

    // ----------------------------------------------------------
    // STEP 99: Terminal State / AI Passthrough
    // The menu is done. All future messages go to Eliza (LLM).
    // ----------------------------------------------------------
    case 99: {
      return {
        reply: null,
        nextStep: 99,
        useAI: true,
      };
    }

    // ----------------------------------------------------------
    // DEFAULT: Unknown step → reset to menu start (defensive).
    // ----------------------------------------------------------
    default: {
      console.warn(`⚠️ [MENU_FSM] Unknown step ${currentStep}. Resetting to 0.`);
      return processMenuState(0, incomingText, businessSlug);
    }
  }
}
