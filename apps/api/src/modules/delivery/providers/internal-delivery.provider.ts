import { Injectable } from '@nestjs/common';
import {
  DispatchRequest,
  DispatchResult,
  IDeliveryProvider,
} from './delivery-provider.interface';

@Injectable()
export class InternalDeliveryProvider implements IDeliveryProvider {
  readonly providerName = 'internal';

  async requestDispatch(req: DispatchRequest): Promise<DispatchResult> {
    return {
      provider: this.providerName,
      accepted: true,
      externalReferenceId: `INT-${req.orderNumber}`,
    };
  }
}
