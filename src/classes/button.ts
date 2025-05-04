import type { Player } from '#classes/player';
import type { Akairo } from '#core/akairo';
import {
  ButtonStyle,
  type ButtonTextColour,
  IS_BFN,
  type IS_BTC,
  IS_BTN,
  IS_BTT,
  PacketType,
} from 'node-insim/packets';

export class Button {
  private static autoUpdateButtons = new WeakMap<Akairo, Set<Button>>();
  private static autoUpdateInterval = new WeakMap<Akairo, NodeJS.Timeout>();

  /** Unique identifier for the button */
  public id!: () => number;

  /** Function that returns the button's style */
  public style!: () => ButtonStyle | ButtonTextColour;

  /** Function that returns the button's title */
  public title!: () => string;

  /** Function that returns the button's caption */
  public caption!: () => string;

  /** Function that returns the length of the input field */
  public length!: () => number;

  /** Function that returns the button's width */
  public width!: () => number;

  /** Function that returns the button's height */
  public height!: () => number;

  /** Function that returns the button's left position */
  public left!: () => number;

  /** Function that returns the button's top position */
  public top!: () => number;

  /** Function that determines if the button should only be clicked once */
  public clickOnce!: () => boolean;

  /** Function that determines if the button is visible */
  public isVisible!: () => boolean;

  /** Reference to the parent button if this is a child button */
  public parent!: Button;

  /** Array of child buttons */
  public childs: Button[] = [];

  /** Function to unbind event listeners */
  public unbind!: () => void;

  /** Interval for automatic updates */
  public interval!: NodeJS.Timeout;

  /** Handler for update events */
  private onUpdateHandler!: (button: Button) => void;

  public constructor(public readonly player: Player) {
    this.resetProperties();
  }

  /**
   * Sets the button's id
   * @param id Button id
   */
  public setId(id: () => number): this {
    this.id = id;
    return this.queueUpdate();
  }

  /**
   * Sets the button's style
   * @param style Function that returns the button style
   */
  public setStyle(style: () => ButtonStyle | ButtonTextColour): this {
    this.style = style;
    return this.queueUpdate();
  }

  /**
   * Sets the button's title
   * @param title Function that returns the title string
   */
  public setTitle(title: () => string): this {
    this.title = title;
    return this.queueUpdate();
  }

  /**
   * Sets the button's textbox title
   * @param caption Function that returns the textbox title string
   */
  public setCaption(caption: () => string): this {
    this.caption = caption;
    return this.queueUpdate();
  }

  /**
   * Sets the input field length
   * @param length Function that returns the length value
   */
  public setLength(length: () => number): this {
    this.length = length;
    return this.queueUpdate();
  }

  /**
   * Sets the button's width
   * @param width Function that returns the width value
   */
  public setWidth(width: () => number): this {
    this.width = width;
    return this.queueUpdate();
  }

  /**
   * Sets the button's height
   * @param height Function that returns the height value
   */
  public setHeight(height: () => number): this {
    this.height = height;
    return this.queueUpdate();
  }

  /**
   * Sets the button's left position
   * @param left Function that returns the left position value
   */
  public setLeft(left: () => number): this {
    this.left = left;
    return this.queueUpdate();
  }

  /**
   * Sets the button's top position
   * @param top Function that returns the top position value
   */
  public setTop(top: () => number): this {
    this.top = top;
    return this.queueUpdate();
  }

  /**
   * Sets whether the button should only be clicked once
   * @param clickOnce Function that returns the clickOnce boolean
   */
  public setClickOnce(clickOnce: () => boolean): this {
    this.clickOnce = clickOnce;
    return this.queueUpdate();
  }

  /**
   * Sets the button's visibility
   * @param isVisible Function that returns the visibility boolean
   */
  public setIsVisible(isVisible: () => boolean): this {
    this.isVisible = isVisible;
    return this.queueUpdate();
  }

  /**
   * Adds a click event handler to the button
   * @param callback Function to be called when the button is clicked
   */
  public onClick(
    callback: ({
      text,
      button,
      unbind,
    }: {
      text: string;
      button: Button;
      unbind: () => void;
    }) => void,
  ): Button {
    const type =
      (this.caption() ?? this.length())
        ? PacketType.ISP_BTT
        : PacketType.ISP_BTC;

    const bind = (packet: IS_BTT | IS_BTC): void => {
      if (
        packet.ClickID === this.id() &&
        packet.UCID === this.player.uniqueId
      ) {
        const text = packet instanceof IS_BTT ? packet.Text : '';

        if (this.clickOnce()) {
          unbind();
        }

        callback({ text, button: this, unbind });
      }
    };

    const unbind = (): void => {
      this.player.akairo.insim.removeListener(type, bind);
      this.unbind = undefined!;
    };

    this.unbind = unbind;
    this.player.akairo.insim.addListener(type, bind);

    return this;
  }

  /**
   * Appends a child button to this button
   * @param callback A single button callback (already instantiated)
   * @param disableAutoUpdate Whether to disable automatic state updates
   */
  public append(
    callback: (button: Button) => Button,
    disableAutoUpdate?: boolean,
  ): this {
    const button = this.player.button();

    button.style = this.style;
    button.isVisible = this.isVisible;
    button.parent = this;
    button.create(disableAutoUpdate);

    this.childs.push(button);
    callback(button);

    return this;
  }

  /**
   * Removes a child button
   * @param button The button to remove
   */
  public remove(button: Button): this {
    const index = this.childs.findIndex((c) => c.id() === button.id());

    if (index !== -1) {
      this.childs[index].destroy();
      this.childs.splice(index, 1);
    }

    return this;
  }

  /**
   * Creates the button and starts auto-update if enabled
   * @param disableAutoUpdate Whether to disable automatic state updates
   */
  public create(disableAutoUpdate?: boolean): Button {
    if (typeof this.id() === 'undefined') return null!;
    if (!disableAutoUpdate) {
      this.manageAutoUpdate();
    }

    this.update();
    return this;
  }

  /**
   * Updates the button's state and appearance
   */
  public update(): Button {
    if (
      typeof this.id() === 'undefined' ||
      typeof this.player === 'undefined' ||
      this.width() <= 0 ||
      this.height() <= 0
    ) {
      return this;
    }

    this.player.akairo.insim.send(
      new IS_BTN({
        ClickID: Math.min(Math.max(this.id(), 0), 239),
        BStyle: this.isVisible() ? this.style() : ButtonStyle.ISB_LEFT,
        Text: `\0${this.caption() ?? '\b'}\0${this.isVisible() ? this.title() : ''}`,
        TypeIn: Math.min(Math.max(this.length(), 0), 255),
        W: Math.min(this.width(), 200),
        H: Math.min(this.height(), 200),
        L: Math.min(this.left(), 200),
        T: Math.min(this.top(), 200),
        UCID: this.player ? this.player.uniqueId : 255,
        ReqI: 2,
      }),
    );

    this.onUpdateHandler?.(this);
    this.updateChildren();

    return this;
  }

  /**
   * Destroys the button, removing it from display
   */
  public destroy(): Button {
    if (typeof this.id() === 'undefined') {
      return this;
    }

    if (this.player.buttons.has(this.id())) {
      this.player.buttons.delete(this.id());
    }

    this.destroyAllChildren();
    this.player.akairo.insim.send(
      new IS_BFN({
        UCID: this.player.uniqueId,
        ClickID: Math.min(Math.max(this.id(), 0), 239),
      }),
    );

    this.cleanupProperties();
    return this;
  }

  /**
   * Sets a handler for update events
   * @param callback Function to be called when the button is updated
   */
  public onUpdate(callback: (button: Button) => void) {
    this.onUpdateHandler = callback;
  }

  private manageAutoUpdate(): void {
    let buttons = Button.autoUpdateButtons.get(this.player.akairo);

    if (!buttons) {
      buttons = new Set();
      Button.autoUpdateButtons.set(this.player.akairo, buttons);
    }

    buttons.add(this);

    if (!Button.autoUpdateInterval.has(this.player.akairo)) {
      const interval = setInterval(() => {
        const currentButtons = Button.autoUpdateButtons.get(this.player.akairo);

        if (!currentButtons || currentButtons.size === 0) {
          clearInterval(interval);
          Button.autoUpdateInterval.delete(this.player.akairo);

          return;
        }

        currentButtons.forEach((button) => button.update());
      }, this.player.akairo.settings?.interface ?? 1000);

      Button.autoUpdateInterval.set(this.player.akairo, interval);
    }
  }

  private queueUpdate(): this {
    if (!Button.autoUpdateButtons.get(this.player.akairo)?.has(this)) {
      this.update();
    }

    return this;
  }

  private updateChildren(): void {
    for (const child of this.childs) {
      child.update();
    }
  }

  private destroyAllChildren(): void {
    for (const child of this.childs) {
      child.destroy();
    }
  }

  private cleanupProperties(): void {
    const buttons = Button.autoUpdateButtons.get(this.player.akairo);

    if (buttons) {
      buttons.delete(this);

      if (buttons.size === 0) {
        const interval = Button.autoUpdateInterval.get(this.player.akairo);

        if (interval) {
          clearInterval(interval);
          Button.autoUpdateInterval.delete(this.player.akairo);
        }
      }
    }

    this.unbind?.();
    this.resetProperties();

    for (const child of this.childs) {
      child.destroy();
    }
  }

  private resetProperties(): void {
    this.id = () => undefined!;
    this.style = () => undefined!;
    this.title = () => '';
    this.caption = () => undefined!;
    this.length = () => 0;
    this.width = () => 0;
    this.height = () => 0;
    this.left = () => 0;
    this.top = () => 0;
    this.clickOnce = () => false;
    this.isVisible = () => true;
  }
}
