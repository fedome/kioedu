import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards, Patch } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // -- Stats (Dashboard) --
  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  // -- Users / Parents --
  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; email?: string; roles?: string[] }
  ) {
    return this.adminService.updateUser(id, body);
  }

  @Post('users/:id/reset-password')
  async forcePasswordReset(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.forcePasswordReset(id);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteUser(id);
  }

  // -- Owners --
  @Get('owners')
  async getOwners() {
    return this.adminService.getOwners();
  }

  @Post('owners')
  async createOwner(@Body() body: { name: string; schoolId: number; mpAccessToken?: string; mpPublicKey?: string }) {
    return this.adminService.createOwner(body);
  }

  @Patch('owners/:id')
  async updateOwner(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; schoolId?: number; mpAccessToken?: string; mpPublicKey?: string }
  ) {
    return this.adminService.updateOwner(id, body);
  }

  @Delete('owners/:id')
  async deleteOwner(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteOwner(id);
  }

  // -- Kiosks --
  @Get('kiosks')
  async getKiosks() {
    return this.adminService.getKiosks();
  }

  @Post('kiosks')
  async createKiosk(@Body() body: { name: string; schoolId: number; ownerId: number }) {
    return this.adminService.createKiosk(body);
  }

  @Post('kiosks/:id/rotate-key')
  async rotateKioskApiKey(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.rotateKioskApiKey(id);
  }

  @Patch('kiosks/:id/subscription')
  async toggleKioskSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body('active') active: boolean
  ) {
    return this.adminService.toggleKioskSubscription(id, active);
  }

  @Get('kiosks/:id/billing-link')
  async generateBillingLink(@Param('id', ParseIntPipe) id: number) {
    // Genera un link mock a MercadoPago. En prod usaríamos mp.preapproval.create
    const timestamp = Date.now();
    const subId = `sub_${timestamp}`;
    const mpLink = `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${subId}&external_reference=${id}`;
    return { link: mpLink };
  }

  @Patch('kiosks/:id')
  async updateKiosk(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; schoolId?: number; ownerId?: number }
  ) {
    return this.adminService.updateKiosk(id, body);
  }

  @Delete('kiosks/:id')
  async deleteKiosk(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteKiosk(id);
  }
}
