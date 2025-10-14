import { Component } from "@theme/component";
import { onAnimationEnd } from "@theme/utilities";
import { ThemeEvents, CartUpdateEvent } from "@theme/events";

/**
 * A custom element that displays a cart icon.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} cartDisplay - The cart bubble element.
 * @property {HTMLElement} cartDisplayText - The cart bubble text element.
 * @property {HTMLElement} cartDisplayNumber - The cart bubble count element.
 *
 * @extends {Component<Refs>}
 */
class CartIcon extends Component {
  // CUSTOM: Updated ref names for consistency between bubble and count styles
  // Old refs (Shopify Horizon original):
  // requiredRefs = ['cartBubble', 'cartBubbleText', 'cartBubbleCount'];

  // New unified refs (works for both bubble and count):
  requiredRefs = ["cartDisplay", "cartDisplayText", "cartDisplayNumber"];

  /** @type {number} */
  get currentCartCount() {
    return parseInt(this.refs.cartDisplayNumber.textContent ?? "0", 10);
  }

  set currentCartCount(value) {
    this.refs.cartDisplayNumber.textContent = value < 100 ? String(value) : "";
  }

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(ThemeEvents.cartUpdate, this.onCartUpdate);
    this.ensureCartBubbleIsCorrect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(ThemeEvents.cartUpdate, this.onCartUpdate);
  }

  /**
   * Handles the cart update event.
   * @param {CartUpdateEvent} event - The cart update event.
   */
  onCartUpdate = async (event) => {
    const itemCount = event.detail.data?.itemCount ?? 0;
    const comingFromProductForm = event.detail.data?.source === "product-form-component";

    this.renderCartBubble(itemCount, comingFromProductForm);
  };

  /**
   * Renders the cart bubble.
   * @param {number} itemCount - The number of items in the cart.
   * @param {boolean} comingFromProductForm - Whether the cart update is coming from the product form.
   */
  renderCartBubble = async (itemCount, comingFromProductForm, animate = true) => {
    // If the cart update is coming from the product form, we add to the current cart count, otherwise we set the new cart count
    const isBubble = this.refs.cartDisplay.classList.contains("cart-bubble");
    const animatingClass = isBubble ? "cart-bubble--animating" : "cart-count--animating";

    this.refs.cartDisplayNumber.classList.toggle("hidden", itemCount === 0 && isBubble);
    this.refs.cartDisplay.classList.toggle("visually-hidden", itemCount === 0 && isBubble);
    this.refs.cartDisplay.classList.toggle(animatingClass, itemCount > 0 && animate);

    this.currentCartCount = comingFromProductForm ? this.currentCartCount + itemCount : itemCount;

    this.classList.toggle("header-actions__cart-icon--has-cart", itemCount > 0 && isBubble);

    sessionStorage.setItem(
      "cart-count",
      JSON.stringify({
        value: String(this.currentCartCount),
        timestamp: Date.now(),
      })
    );

    if (!animate) return;
    await onAnimationEnd(this.refs.cartDisplayText);

    this.refs.cartDisplay.classList.remove(animatingClass);
  };

  /**
   * Checks if the cart count is correct.
   */
  ensureCartBubbleIsCorrect = () => {
    const sessionStorageCount = sessionStorage.getItem("cart-count");
    const visibleCount = this.refs.cartDisplayNumber.textContent;

    if (sessionStorageCount === visibleCount || sessionStorageCount === null) return;

    try {
      const { value, timestamp } = JSON.parse(sessionStorageCount);

      if (Date.now() - timestamp < 10000) {
        const count = parseInt(value, 10);

        if (count >= 0) {
          this.renderCartBubble(count, false, false);
        }
      }
    } catch (_) {
      // no-op
    }
  };
}

if (!customElements.get("cart-icon")) {
  customElements.define("cart-icon", CartIcon);
}
