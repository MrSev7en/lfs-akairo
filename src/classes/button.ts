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

  /** Function that returns the player ID associated with the button */
  public playerId!: () => string;

  /** Function that returns the player Unique ID associated with the button */
  public playerUniqueId!: () => number;

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

  public constructor(public readonly akairo: Akairo) {
    this.id = () => undefined as never;
    this.style = () => undefined as never;
    this.title = () => '';
    this.caption = () => undefined as never;
    this.length = () => 0;
    this.width = () => 0;
    this.height = () => 0;
    this.left = () => 0;
    this.top = () => 0;
    this.playerId = () => undefined as never;
    this.playerUniqueId = () => undefined as never;
    this.clickOnce = () => false;
    this.isVisible = () => true;
  }

  /**
   * Sets the button's style
   * @param style Function that returns the button style
   */
  public setStyle(style: () => ButtonStyle | ButtonTextColour): Button {
    this.style = style;
    this.update();
    return this;
  }

  /**
   * Sets the button's title
   * @param title Function that returns the title string
   */
  public setTitle(title: () => string): Button {
    this.title = title;
    this.update();
    return this;
  }

  /**
   * Sets the button's textbox title
   * @param caption Function that returns the textbox title string
   */
  public setCaption(caption: () => string): Button {
    this.caption = caption;
    this.update();
    return this;
  }

  /**
   * Sets the input field length
   * @param length Function that returns the length value
   */
  public setLength(length: () => number): Button {
    this.length = length;
    this.update();
    return this;
  }

  /**
   * Sets the button's width
   * @param width Function that returns the width value
   */
  public setWidth(width: () => number): Button {
    this.width = width;
    this.update();
    return this;
  }

  /**
   * Sets the button's height
   * @param height Function that returns the height value
   */
  public setHeight(height: () => number): Button {
    this.height = height;
    this.update();
    return this;
  }

  /**
   * Sets the button's left position
   * @param left Function that returns the left position value
   */
  public setLeft(left: () => number): Button {
    this.left = left;
    this.update();
    return this;
  }

  /**
   * Sets the button's top position
   * @param top Function that returns the top position value
   */
  public setTop(top: () => number): Button {
    this.top = top;
    this.update();
    return this;
  }

  /**
   * Sets the player ID associated with the button
   * @param playerId Function that returns the player ID
   */
  public setPlayerId(playerId: () => string): Button {
    this.playerId = playerId;
    this.update();
    return this;
  }

  /**
   * Sets the player Unique ID associated with the button
   * @param playerUniqueId Function that returns the player Unique ID
   */
  public setPlayerUniqueId(playerUniqueId: () => number): Button {
    this.playerUniqueId = playerUniqueId;
    this.update();
    return this;
  }

  /**
   * Sets whether the button should only be clicked once
   * @param clickOnce Function that returns the clickOnce boolean
   */
  public setClickOnce(clickOnce: () => boolean): Button {
    this.clickOnce = clickOnce;
    this.update();
    return this;
  }

  /**
   * Sets the button's visibility
   * @param isVisible Function that returns the visibility boolean
   */
  public setIsVisible(isVisible: () => boolean): Button {
    this.isVisible = isVisible;
    this.update();
    return this;
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
        packet.UCID === this.playerUniqueId()
      ) {
        const text = packet instanceof IS_BTT ? packet.Text : '';

        if (this.clickOnce()) {
          unbind();
        }

        callback({ text, button: this, unbind });
      }
    };

    const unbind = (): void => {
      this.akairo.insim.removeListener(type, bind);
      this.unbind = undefined as never;
    };

    this.unbind = unbind;
    this.akairo.insim.addListener(type, bind);

    return this;
  }

  /**
   * Appends a child button to this button
   * @param callback A single button callback (already instantiated)
   */
  public append(callback: (button: Button) => Button): this {
    const button = new Button(this.akairo);

    button.playerId = this.playerId;
    button.playerUniqueId = this.playerUniqueId;

    this.appendChild(button);
    callback(button);

    return this;
  }

  /**
   * Appends one or more child buttons to this button
   * @param buttons A single button, array of buttons, or null
   */
  public appendChild(buttons: Button | Button[] | null): this {
    if (Array.isArray(buttons)) {
      for (const button of buttons) {
        if (button) {
          button.parent = this;
          this.childs.push(button);
        }
      }
    } else if (buttons) {
      buttons.parent = this;
      this.childs.push(buttons);
    }

    return this;
  }

  /**
   * Removes a child button
   * @param button The button to remove
   */
  public removeChild(button: Button): Button {
    const index = this.childs.findIndex((c) => c.id === button.id);

    if (index !== -1) {
      button.destroy();

      this.childs[index].parent = undefined as never;
      this.childs.splice(index, 1);
    }

    return this;
  }

  /**
   * Creates the button and starts auto-update if enabled
   * @param disableAutoUpdate Whether to disable automatic updates
   */
  public create(disableAutoUpdate?: boolean): Button {
    if (typeof this.id() === 'undefined') {
      // Create an clone of generated unique id
      const { id } = Object.assign(
        {},
        { ...{ id: this.akairo.tags.getUniqueId(this) } },
      );

      this.id = () => id;
    }

    if (!disableAutoUpdate && !this.interval) {
      this.interval = setInterval(
        () => this.update(),
        this.akairo.settings?.interface ?? 1000,
      );
    }

    this.update();
    return this;
  }

  /**
   * Updates the button's state and appearance
   */
  public update(): Button {
    if (typeof this.id() === 'undefined') {
      return this;
    }

    this.akairo.insim.send(
      new IS_BTN({
        ClickID: Math.min(Math.max(this.id(), 0), 239),
        BStyle: this.isVisible() ? this.style() : ButtonStyle.ISB_LEFT,
        Text: `\0${this.caption() ?? '\b'}\0${this.isVisible() ? (this.title() ?? '') : ''}`,
        TypeIn:
          this.length() === 255
            ? 255
            : Math.min(Math.max(this.length(), 0), 95),
        W: Math.min(Math.max(this.width(), 0), 200),
        H: Math.min(Math.max(this.height(), 0), 200),
        L: Math.min(Math.max(this.left(), 0), 200),
        T: Math.min(Math.max(this.top(), 0), 200),
        UCID: this.playerUniqueId() ?? 255,
        ReqI: 2,
      }),
    );

    if (typeof this.onUpdateHandler === 'function') {
      this.onUpdateHandler(this);
    }

    for (const child of this.childs) {
      if (typeof child.style() === 'undefined') {
        child.style = this.style;
      }

      if (typeof child.playerId() === 'undefined') {
        child.playerId = this.playerId;
      }

      if (typeof child.playerUniqueId() === 'undefined') {
        child.playerUniqueId = this.playerUniqueId;
      }

      child.create();
    }

    return this;
  }

  /**
   * Destroys the button, removing it from display
   */
  public destroy(): Button {
    if (typeof this.id() === 'undefined') {
      return this;
    }

    this.akairo.insim.send(
      new IS_BFN({
        UCID: this.playerUniqueId(),
        ClickID: Math.min(Math.max(this.id(), 0), 239),
      }),
    );

    this.dispose();
    this.isVisible = () => false;

    for (const child of this.childs) {
      child.destroy();
    }

    return this;
  }

  /**
   * Disposes of the button, cleaning up resources without visual updates
   */
  public dispose(): Button {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined as never;
    }

    if (this.unbind) {
      this.unbind();
    }

    this.akairo.tags.releaseUniqueId(this.playerId(), this.id());
    this.id = () => undefined as never;

    return this;
  }

  /**
   * Sets a handler for update events
   * @param callback Function to be called when the button is updated
   */
  public onUpdate(callback: (button: Button) => void) {
    this.onUpdateHandler = callback;
  }
}
