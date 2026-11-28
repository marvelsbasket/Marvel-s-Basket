export interface SmsSendRequest {
  toPhone: string;
  templateId: string;
  body: string;
}

export interface ChannelDispatchResult {
  success: boolean;
  skipped?: boolean;
  provider: string;
  providerMessageId?: string;
  error?: string;
}

export interface ISmsProvider {
  readonly providerName: string;
  sendSms(request: SmsSendRequest): Promise<ChannelDispatchResult>;
}

export interface PushSendRequest {
  userId: string;
  title: string;
  body: string;
  actionUrl?: string | null;
}

export interface IPushProvider {
  readonly providerName: string;
  sendPush(request: PushSendRequest): Promise<ChannelDispatchResult>;
}

/**
 * Default SMS provider stub while SMS vendor & Indian DLT registration remain pending.
 */
export class DisabledSmsProvider implements ISmsProvider {
  readonly providerName = 'sms_disabled';

  async sendSms(): Promise<ChannelDispatchResult> {
    return {
      success: false,
      skipped: true,
      provider: this.providerName,
      error: 'SMS channel is disabled pending provider approval and DLT registration.',
    };
  }
}

/**
 * Default Push provider stub while mobile/Web Push platform remains pending.
 */
export class DisabledPushProvider implements IPushProvider {
  readonly providerName = 'push_disabled';

  async sendPush(): Promise<ChannelDispatchResult> {
    return {
      success: false,
      skipped: true,
      provider: this.providerName,
      error: 'Push channel is disabled pending push platform approval.',
    };
  }
}
