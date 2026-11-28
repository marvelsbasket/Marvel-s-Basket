export interface DispatchRequest {
  deliveryId: string;
  orderId: string;
  orderNumber: string;
  pickupAddress: Record<string, unknown>;
  deliveryAddress: Record<string, unknown>;
}

export interface DispatchResult {
  provider: string;
  accepted: boolean;
  externalReferenceId?: string;
}

export interface IDeliveryProvider {
  readonly providerName: string;
  requestDispatch(req: DispatchRequest): Promise<DispatchResult>;
}

export const DELIVERY_PROVIDER_TOKEN = 'DELIVERY_PROVIDER_TOKEN';
