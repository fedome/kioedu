import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../../core/services/products.service';

@Component({
    selector: 'app-product-history-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-history-modal.html'
})
export class ProductHistoryModalComponent implements OnInit {
    @Input() product: any;
    @Output() close = new EventEmitter<void>();

    private productsService = inject(ProductsService);

    history: any[] = [];
    loading = true;

    ngOnInit() {
        if (this.product && this.product.id) {
            this.loadHistory();
        }
    }

    async loadHistory() {
        try {
            this.loading = true;
            this.history = await this.productsService.getStockHistory(this.product.id);
        } catch (e) {
            console.error('Error loading history', e);
        } finally {
            this.loading = false;
        }
    }
}
