import { Event } from '#core/event';
import { Module } from '#core/module';
import { Cars } from '#managers/cars';
import { Players } from '#managers/players';
import { Tags } from '#managers/tags';
import type { Locale } from '#types/locale';
import { convertLanguage, i18n } from '#utils/i18n';
import { logger } from '#utils/logger';
import type { Dict } from 'i18n-js';
import { InSim } from 'node-insim';
import {
  IS_TINY,
  Language,
  PacketType,
  TinyType,
  type InSimFlags,
} from 'node-insim/packets';

export class Akairo {
  /** InSim instance for server communication */
  public insim!: InSim;

  /** List of connected players */
  public players!: Players;

  /** Utils functions related to players cars */
  public cars!: Cars;

  /** List of loaded modules */
  public modules!: Module[];

  /** List of loaded localization data */
  public locales!: Locale<any>[];

  /** Tag management instance */
  public tags!: Tags;

  private onConnectHandler!: () => void;

  private onDisconnectHandler!: () => void;

  private options!: { host: string; port: number; password: string };

  /**
   * Creates a new Akairo instance.
   * @param settings Configuration settings for the Akairo instance
   * @param settings.id Unique identifier for InSim
   * @param settings.name Display name for InSim
   * @param settings.prefix Command prefix for InSim
   * @param settings.interval Update interval in milliseconds (used in IS_MCI updates)
   * @param settings.interface Interface update interval in milliseconds (used in button interface updates)
   * @param settings.flags InSim flags for connection configuration
   */
  public constructor(
    public readonly settings?: {
      id?: string;
      name?: string;
      prefix?: string;
      interval?: number;
      interface?: number;
      flags?: InSimFlags;
    },
  ) {
    this.insim = new InSim(this.settings?.id);
    this.players = new Players(this);
    this.cars = new Cars(this);
    this.modules = [];
    this.locales = [];
    this.tags = new Tags(this);

    this.insim.on('connect', () => this.onInSimConnect());
    this.insim.on('disconnect', () => this.onInSimDisconnect());
  }

  /**
   * Establishes connection to the game server.
   * @param options - Connection configuration options
   * @param options.host - Server hostname or IP address
   * @param options.port - Server InSim port number
   * @param options.password - Server admin password
   */
  public connect(options: {
    host: string;
    port: number;
    password: string;
  }): void {
    this.options = options;

    // Calling after all events was bind.
    const connect = () => {
      this.insim.connect({
        Host: this.options.host,
        Port: this.options.port,
        Admin: this.options.password,
        IName: this.settings?.name,
        Prefix: this.settings?.prefix,
        Interval: this.settings?.interval,
        Flags: this.settings?.flags,
      });
    };

    // We're hidding some packets, because it modifies player list and it can cause exceptions inside modules.
    // This will bind all packets except: ISP_CNL, ISP_PLP and ISP_PLL.
    new Event(
      this,
      [PacketType.ISP_CNL, PacketType.ISP_PLP, PacketType.ISP_PLL],
      () => {
        setTimeout(() => {
          this.modules.forEach((module) => module.bind());

          // Now we bind hidden packets (excluding others).
          // This will only bind: ISP_CNL, ISP_PLP and ISP_PLL.
          setTimeout(() => {
            new Event(this, [
              PacketType.ISP_NCN,
              PacketType.ISP_NCI,
              PacketType.ISP_TOC,
              PacketType.ISP_NPL,
              PacketType.ISP_CPR,
              PacketType.ISP_MCI,
            ]);

            // Wait binding ends to connect.
            setTimeout(() => connect());
          });
        });
      },
    );
  }

  /**
   * Disconnects from the game server.
   */
  public disconnect(): void {
    this.insim.disconnect();
  }

  /**
   * Sets a handler for connection events.
   * @param callback Function to be called when connection is established
   */
  public onConnect(callback: () => void): void {
    this.onConnectHandler = callback;
  }

  /**
   * Sets a handler for disconnection events.
   * @param callback Function to be called when connection is lost
   */
  public onDisconnect(callback: () => void): void {
    this.onDisconnectHandler = callback;
  }

  /**
   * Loads a module into the system.
   * @param module Module class to be loaded
   */
  public loadModule(module: new (akairo: Akairo) => Module): void {
    this.modules.push(new module(this));
    logger.info(`Module "${module.name}" was load.`);
  }

  /**
   * Unloads a module from the system.
   * @param module Module class to be unloaded
   */
  public unloadModule(module: new (akairo: Akairo) => Module): void {
    const index = this.modules.findIndex((m) => Module.bind(m).name);

    if (index !== -1) {
      this.modules.splice(index, 1);
      logger.warn(`Module "${module}" was unload.`);
    } else {
      logger.error(`Module "${module}" was not found.`);
    }
  }

  /**
   * Loads localization data for a specific language.
   * @param language Language identifier
   * @param content Localization content
   * @template T Type of the localization content
   */
  public loadLocale<T>(language: Language, content: T): void {
    const locale = convertLanguage(language);
    const values = { [locale]: content } as Dict;

    i18n.store(values);
    this.locales.push({ language, content });

    logger.info(`Locale "${Language[language]}" was load.`);
  }

  /**
   * Unloads localization data for a specific language.
   * @param language - Language identifier to unload
   */
  public unloadLocale(language: Language): void {
    const index = this.locales.findIndex((l) => l.language === language);

    if (index !== -1) {
      this.locales.splice(index, 1);
      logger.warn(`Locale "${Language[language]}" was unload.`);
    } else {
      logger.error(`Locale "${Language[language]}" was not found.`);
    }
  }

  private onInSimConnect(): void {
    const { host, port } = this.options;
    const id = this.settings?.id ?? '-';

    logger.info(`InSim "${id}" was connected to: "${host}:${port}"`);

    this.bindInSimReceptors();
    this.onConnectHandler?.();
  }

  private onInSimDisconnect(): void {
    logger.warn('InSim was disconnected.');
    this.onDisconnectHandler?.();
  }

  private bindInSimReceptors(): void {
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_VER, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_PING, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_NCN, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_NCI, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_NPL, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_NLP, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_MCI, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_SCP, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_SST, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_GTH, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_ISM, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_RES, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_REO, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_RST, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_AXI, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_RIP, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_ALC, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_AXM, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_SLC, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_MAL, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_PLH, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_IPB, ReqI: 2 }));

    logger.info('LFS Akairo was successfully connected and working!');
  }
}
