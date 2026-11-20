import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { EmailModule } from '../email/email.module';
import { SellersController } from './sellers.controller';
import { AdminSellersController } from './admin-sellers.controller';
import { SellersService } from './sellers.service';
import { AdminSellersService } from './admin-sellers.service';

@Module({
  imports: [PrismaModule, CloudinaryModule, EmailModule],
  controllers: [SellersController, AdminSellersController],
  providers: [SellersService, AdminSellersService],
  exports: [SellersService, AdminSellersService],
})
export class SellersModule {}
