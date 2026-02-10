import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  channels: {
    webpush?: {
      title: string;
      body: string;
    };
    fcm?: {
      title: string;
      body: string;
    };
    socket?: {
      event: string;
      payload: Record<string, any>;
    };
  };
  dataFields: string[];
  i18n?: Record<string, Record<string, {
    title: string;
    body: string;
  }>>;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface CreateTemplateParams {
  name: string;
  description?: string;
  channels: {
    webpush?: {
      title: string;
      body: string;
    };
    fcm?: {
      title: string;
      body: string;
    };
    socket?: {
      event: string;
      payload: Record<string, any>;
    };
  };
  dataFields?: string[];
  i18n?: Record<string, Record<string, {
    title: string;
    body: string;
  }>>;
}

export interface RenderOptions {
  locale?: string;
  data: Record<string, string | number | boolean>;
  type?: string;
  badges?: {
    unread: number;
    read: number;
  };
}

export interface RenderedNotification {
  title?: string;
  body?: string;
  type?: string;
  data?: Record<string, string>;
  channels: Record<string, any>;
  badges?: {
    unread: number;
    read: number;
  };
}

export interface TemplateStore {
  create(params: CreateTemplateParams): Promise<NotificationTemplate>;
  getById(id: string): Promise<NotificationTemplate | null>;
  getByName(name: string): Promise<NotificationTemplate | null>;
  getAll(activeOnly?: boolean): Promise<NotificationTemplate[]>;
  update(
    id: string,
    params: Partial<CreateTemplateParams>
  ): Promise<NotificationTemplate | null>;
  delete(id: string): Promise<boolean>;
  activate(id: string): Promise<boolean>;
  deactivate(id: string): Promise<boolean>;
}

export class InMemoryTemplateStore implements TemplateStore {
  private store: Map<string, NotificationTemplate> = new Map();
  private nameIndex: Map<string, string> = new Map();
  private readonly logger = Logger.getLogger('InMemoryTemplateStore');

  async create(params: CreateTemplateParams): Promise<NotificationTemplate> {
    const template: NotificationTemplate = {
      id: uuidv4(),
      name: params.name,
      description: params.description,
      channels: params.channels,
      dataFields: params.dataFields || [],
      i18n: params.i18n,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.store.set(template.id, template);
    this.nameIndex.set(params.name, template.id);

    this.logger.info('Template created', { id: template.id, name: template.name });

    return template;
  }

  async getById(id: string): Promise<NotificationTemplate | null> {
    return this.store.get(id) || null;
  }

  async getByName(name: string): Promise<NotificationTemplate | null> {
    const id = this.nameIndex.get(name);
    if (!id) return null;
    return this.store.get(id) || null;
  }

  async getAll(activeOnly: boolean = false): Promise<NotificationTemplate[]> {
    const templates = Array.from(this.store.values());
    if (activeOnly) {
      return templates.filter((t) => t.isActive);
    }
    return templates;
  }

  async update(
    id: string,
    params: Partial<CreateTemplateParams>
  ): Promise<NotificationTemplate | null> {
    const template = this.store.get(id);
    if (!template) return null;

    const updated: NotificationTemplate = {
      ...template,
      name: params.name || template.name,
      description: params.description ?? template.description,
      channels: params.channels || template.channels,
      dataFields: params.dataFields || template.dataFields,
      i18n: params.i18n || template.i18n,
      updatedAt: new Date(),
    };

    this.store.set(id, updated);
    this.nameIndex.set(updated.name, id);

    this.logger.info('Template updated', { id: updated.id, name: updated.name });

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const template = this.store.get(id);
    if (!template) return false;

    this.store.delete(id);
    this.nameIndex.delete(template.name);

    this.logger.info('Template deleted', { id, name: template.name });

    return true;
  }

  async activate(id: string): Promise<boolean> {
    const template = this.store.get(id);
    if (!template) return false;

    template.isActive = true;
    template.updatedAt = new Date();

    return true;
  }

  async deactivate(id: string): Promise<boolean> {
    const template = this.store.get(id);
    if (!template) return false;

    template.isActive = false;
    template.updatedAt = new Date();

    return true;
  }
}

export class TemplateRenderer {
  private static readonly VAR_REGEX = /\{\{([^}]+)\}\}/g;
  private store: TemplateStore;

  constructor(store: TemplateStore) {
    this.store = store;
  }

  async render(
    templateIdOrName: string,
    options: RenderOptions
  ): Promise<RenderedNotification> {
    let template = await this.store.getById(templateIdOrName);

    if (!template) {
      template = await this.store.getByName(templateIdOrName);
    }

    if (!template) {
      throw new Error(`Template not found: ${templateIdOrName}`);
    }

    if (!template.isActive) {
      throw new Error(`Template is inactive: ${templateIdOrName}`);
    }

    const channels: Record<string, any> = {};
    const data: Record<string, string> = {};
    const { locale, data: templateData, badges } = options;

    for (const [key, value] of Object.entries(templateData || {})) {
      data[key] = String(value);
    }

    if (template.channels.webpush) {
      channels.webpush = {
        title: this.interpolate(template.channels.webpush.title, data, locale, template.i18n),
        body: this.interpolate(template.channels.webpush.body, data, locale, template.i18n),
      };
    }

    if (template.channels.fcm) {
      channels.fcm = {
        title: this.interpolate(template.channels.fcm.title, data, locale, template.i18n),
        body: this.interpolate(template.channels.fcm.body, data, locale, template.i18n),
      };
    }

    if (template.channels.socket) {
      channels.socket = {
        event: template.channels.socket.event,
        payload: this.interpolateObject(template.channels.socket.payload, data, locale, template.i18n),
      };
    }

    const rendered: RenderedNotification = {
      title: channels.fcm?.title || channels.webpush?.title,
      body: channels.fcm?.body || channels.webpush?.body,
      type: options.type || template.name,
      data,
      channels,
      badges,
    };

    return rendered;
  }

  private interpolate(
    template: string,
    data: Record<string, string>,
    locale?: string,
    i18n?: Record<string, Record<string, { title: string; body: string }>>
  ): string {
    let result = template;

    if (locale && i18n?.[locale]) {
      const localized = i18n[locale][template];
      if (localized) {
        result = localized;
      }
    }

    return result.replace(this.constructor.VAR_REGEX, (_, varName) => {
      const key = varName.trim();
      if (data.hasOwnProperty(key)) {
        return String(data[key]);
      }
      return `{{${key}}}`;
    });
  }

  private interpolateObject(
    obj: Record<string, any>,
    data: Record<string, string>,
    locale?: string,
    i18n?: Record<string, Record<string, { title: string; body: string }>>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolate(value, data, locale, i18n);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObject(value, data, locale, i18n);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  async renderBatch(
    templates: { id: string; data: Record<string, string | number | boolean> }[],
    locale?: string,
    type?: string
  ): Promise<RenderedNotification[]> {
    return Promise.all(
      templates.map((t) => this.render(t.id, { locale, data: t.data, type }))
    );
  }

  validateTemplate(template: CreateTemplateParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (
      !template.channels.webpush &&
      !template.channels.fcm &&
      !template.channels.socket
    ) {
      errors.push('At least one channel configuration is required');
    }

    if (template.channels.webpush) {
      if (!template.channels.webpush.title) {
        errors.push('WebPush title is required');
      }
      if (!template.channels.webpush.body) {
        errors.push('WebPush body is required');
      }
    }

    if (template.channels.fcm) {
      if (!template.channels.fcm.title) {
        errors.push('FCM title is required');
      }
      if (!template.channels.fcm.body) {
        errors.push('FCM body is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const createTemplateStore = (): TemplateStore => {
  return new InMemoryTemplateStore();
};

export const createTemplateRenderer = (store?: TemplateStore): TemplateRenderer => {
  return new TemplateRenderer(store || createTemplateStore());
};
