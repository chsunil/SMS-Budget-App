// ─── src/app/features/merchant-rules/merchant-rules.page.ts ─
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { MerchantRulesService } from '../../core/services/merchant-rules.service';
import { MerchantRule, CategoryKey, MatchType } from '../../core/models';

const CAT_META: Record<CategoryKey, { label: string; icon: string; color: string }> = {
    fixed_costs: { label: 'Fixed Costs', icon: '🏦', color: '#f5c842' },
    food_household: { label: 'Food & Household', icon: '🛒', color: '#60a5fa' },
    savings: { label: 'Savings', icon: '💰', color: '#3ecf8e' },
    self_investment: { label: 'Self-Investment', icon: '🌿', color: '#a78bfa' },
    fun_family: { label: 'Fun & Family', icon: '🎉', color: '#fb923c' },
    giving_misc: { label: 'Giving & Misc', icon: '💖', color: '#f472b6' },
    uncategorized: { label: 'Uncategorized', icon: '❓', color: '#94a3b8' },
};

const SUBCATS: Record<CategoryKey, string[]> = {
    fixed_costs: ['🏠 Home EMI', '⚡ Utilities', '🚗 Transport & Fuel'],
    food_household: ['🥬 Home Groceries', '🍕 Takeout / Zomato'],
    savings: ['🛡️ Emergency Fund', '📈 SIPs / MF / RD', '🎯 Short-term Goals'],
    self_investment: ['📚 Online Courses', '🧘 Gym & Wellness', '✨ Personal Growth Fund'],
    fun_family: ['👨‍👩‍👧 Family Dinners & Outings', '🎬 Treats & Hobbies'],
    giving_misc: ['🎁 Gifts & Charitable Acts', '🔧 Misc Unexpected'],
    uncategorized: [],
};

@Component({
    selector: 'app-merchant-rules',
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule],
    template: `
    <ion-header>
      <ion-toolbar>
        <ion-title><span style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800">Merchant Rules</span></ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openAddSheet()" color="warning">
            <ion-icon name="add-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="wrap">

        <!-- Intro card -->
        <div class="intro-card">
          <div class="intro-icon">⚡</div>
          <div>
            <div class="intro-title">Auto-categorization</div>
            <div class="intro-sub">Rules match merchant names in new SMS and manual transactions — no manual picking needed.</div>
          </div>
        </div>

        <!-- Search -->
        <div class="search-wrap">
          <ion-icon name="search-outline" class="search-icon"></ion-icon>
          <input class="search-input" [(ngModel)]="search" placeholder="Search rules…" (ngModelChange)="applyFilter()"/>
        </div>

        <!-- Stats row -->
        <div class="stats-row">
          <div class="stat-pill">
            <span class="stat-num">{{ totalRules }}</span>
            <span class="stat-lbl">Total</span>
          </div>
          <div class="stat-pill green">
            <span class="stat-num">{{ enabledRules }}</span>
            <span class="stat-lbl">Active</span>
          </div>
          <div class="stat-pill gold">
            <span class="stat-num">{{ totalHits }}</span>
            <span class="stat-lbl">Total hits</span>
          </div>
        </div>

        <!-- Category filter tabs -->
        <div class="cat-tabs">
          <button class="cat-tab" [class.active]="filterCat === ''"
            (click)="filterCat=''; applyFilter()">All</button>
          <button class="cat-tab" *ngFor="let cat of catKeys"
            [class.active]="filterCat === cat"
            [style.--tab-color]="catMeta[cat].color"
            (click)="filterCat=cat; applyFilter()">
            {{ catMeta[cat].icon }}
          </button>
        </div>

        <!-- Loading -->
        <div class="loading-wrap" *ngIf="loading">
          <ion-spinner name="crescent" color="warning"></ion-spinner>
        </div>

        <!-- Empty -->
        <div class="empty-wrap" *ngIf="!loading && filteredRules.length === 0">
          <div style="font-size:44px;margin-bottom:12px">🗂</div>
          <div style="font-weight:700;margin-bottom:6px">No rules yet</div>
          <div style="font-size:12px;color:var(--muted)">Tap + to add your first merchant rule</div>
        </div>

        <!-- Rules list -->
        <div class="rules-list" *ngIf="!loading">
          <div class="rule-card" *ngFor="let rule of filteredRules; trackBy: trackById"
            [class.disabled]="!rule.enabled">

            <div class="rule-top">
              <div class="rule-pattern">
                <span class="match-badge" [class]="'match-' + rule.matchType">{{ rule.matchType }}</span>
                <span class="pattern-text">{{ rule.pattern }}</span>
              </div>
              <ion-toggle
                [checked]="rule.enabled"
                (ionChange)="toggleRule(rule, $event)"
                color="warning"
                class="rule-toggle">
              </ion-toggle>
            </div>

            <div class="rule-arrow">
              <span class="arrow-line">→</span>
              <div class="rule-result">
                <span class="cat-dot" [style.background]="catMeta[rule.category]?.color"></span>
                <span class="cat-label">{{ catMeta[rule.category]?.label }}</span>
                <span class="subcat-label" *ngIf="rule.subcategory">· {{ rule.subcategory }}</span>
              </div>
              <div class="hit-badge" *ngIf="rule.hitCount > 0">
                {{ rule.hitCount }}×
              </div>
            </div>

            <div class="rule-actions">
              <span class="priority-chip">P{{ rule.priority }}</span>
              <button class="action-btn" (click)="openEditSheet(rule)">
                <ion-icon name="pencil-outline"></ion-icon> Edit
              </button>
              <button class="action-btn danger" (click)="deleteRule(rule)">
                <ion-icon name="trash-outline"></ion-icon>
              </button>
            </div>
          </div>
        </div>

        <div style="height:80px"></div>
      </div>

      <!-- ── Add / Edit Bottom Sheet ── -->
      <div class="sheet-overlay" [class.open]="sheetOpen" (click)="closeSheet()">
        <div class="sheet" (click)="$event.stopPropagation()">
          <div class="sheet-handle"></div>
          <div class="sheet-title">{{ editingRule ? 'Edit Rule' : 'New Merchant Rule' }}</div>

          <div class="field-group">
            <label class="field-label">Merchant pattern *</label>
            <input class="sheet-input" [(ngModel)]="form.pattern"
              placeholder="e.g. zomato, hdfc emi, amazon"/>
            <div class="field-hint">Case-insensitive. Matches against merchant name + full SMS text.</div>
          </div>

          <div class="field-group">
            <label class="field-label">Match type</label>
            <div class="match-type-row">
              <button class="match-type-btn" *ngFor="let mt of matchTypes"
                [class.active]="form.matchType === mt"
                (click)="form.matchType = mt">{{ mt }}</button>
            </div>
            <div class="field-hint">
              <b>contains</b> = anywhere in text &nbsp;·&nbsp;
              <b>startsWith</b> = begins with &nbsp;·&nbsp;
              <b>exact</b> = full match &nbsp;·&nbsp;
              <b>regex</b> = pattern
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Category *</label>
            <div class="cat-chip-row">
              <button class="cat-chip" *ngFor="let cat of catKeys"
                [class.active]="form.category === cat"
                [style.--chip-color]="catMeta[cat].color"
                (click)="selectCat(cat)">
                {{ catMeta[cat].icon }} {{ catMeta[cat].label }}
              </button>
            </div>
          </div>

          <div class="field-group" *ngIf="form.category && subcats.length > 0">
            <label class="field-label">Subcategory (optional)</label>
            <div class="subcat-chip-row">
              <button class="subcat-chip" [class.active]="form.subcategory === ''"
                (click)="form.subcategory = ''">None</button>
              <button class="subcat-chip" *ngFor="let s of subcats"
                [class.active]="form.subcategory === s"
                (click)="form.subcategory = s">{{ s }}</button>
            </div>
          </div>

          <div class="field-row">
            <div class="field-group" style="flex:1">
              <label class="field-label">Priority (higher = first)</label>
              <input class="sheet-input" type="number" [(ngModel)]="form.priority" min="0" max="100" placeholder="0"/>
            </div>
            <div class="field-group" style="flex:0;padding-top:22px">
              <label class="field-label">Enabled</label>
              <ion-toggle [(ngModel)]="form.enabled" color="warning"></ion-toggle>
            </div>
          </div>

          <!-- Test input -->
          <div class="test-section">
            <div class="test-label">🧪 Test this rule</div>
            <input class="sheet-input" [(ngModel)]="testText" placeholder="Type a merchant name or SMS snippet…" (ngModelChange)="runTest()"/>
            <div class="test-result" *ngIf="testText" [class.match]="testMatch" [class.no-match]="!testMatch">
              {{ testMatch ? '✓ MATCH — will auto-assign to ' + catMeta[form.category]?.label : '✗ No match' }}
            </div>
          </div>

          <button class="save-btn" (click)="saveRule()" [disabled]="saving || !form.pattern || !form.category">
            <ion-spinner *ngIf="saving" name="crescent" style="width:16px;height:16px"></ion-spinner>
            <span *ngIf="!saving">{{ editingRule ? 'Update Rule' : 'Create Rule' }}</span>
          </button>
        </div>
      </div>
    </ion-content>
  `,
    styles: []
})
export class MerchantRulesPage implements OnInit, OnDestroy {
    rules: MerchantRule[] = [];
    filteredRules: MerchantRule[] = [];
    loading = true;
    search = '';
    filterCat: CategoryKey | '' = '';
    sheetOpen = false;
    editingRule: MerchantRule | null = null;
    saving = false;
    testText = '';
    testMatch = false;
    private sub?: Subscription;

    catMeta = CAT_META;
    catKeys = Object.keys(CAT_META).filter(k => k !== 'uncategorized') as CategoryKey[];
    matchTypes: MatchType[] = ['contains', 'startsWith', 'exact', 'regex'];

    form = this.blankForm();

    get totalRules() { return this.rules.length; }
    get enabledRules() { return this.rules.filter(r => r.enabled).length; }
    get totalHits() { return this.rules.reduce((s, r) => s + (r.hitCount || 0), 0); }
    get subcats() { return SUBCATS[this.form.category as CategoryKey] || []; }

    constructor(
        private rulesService: MerchantRulesService,
        private toastCtrl: ToastController,
        private alertCtrl: AlertController,
    ) { }

    ngOnInit() {
        this.sub = this.rulesService.rules$.subscribe(rules => {
            this.rules = rules;
            this.loading = false;
            this.applyFilter();
        });
    }

    ngOnDestroy() { this.sub?.unsubscribe(); }

    applyFilter() {
        let result = [...this.rules];
        if (this.filterCat) result = result.filter(r => r.category === this.filterCat);
        if (this.search) {
            const q = this.search.toLowerCase();
            result = result.filter(r => r.pattern.toLowerCase().includes(q) || r.subcategory?.toLowerCase().includes(q));
        }
        this.filteredRules = result;
    }

    trackById(_: number, r: MerchantRule) { return r.id; }

    blankForm() {
        return { pattern: '', matchType: 'contains' as MatchType, category: '' as CategoryKey, subcategory: '', priority: 0, enabled: true };
    }

    selectCat(cat: CategoryKey) {
        this.form.category = cat;
        this.form.subcategory = '';
        this.runTest();
    }

    runTest() {
        if (!this.testText || !this.form.pattern) { this.testMatch = false; return; }
        const h = this.testText.toLowerCase();
        const p = this.form.pattern.toLowerCase();
        switch (this.form.matchType) {
            case 'contains': this.testMatch = h.includes(p); break;
            case 'startsWith': this.testMatch = h.startsWith(p); break;
            case 'exact': this.testMatch = h.trim() === p; break;
            case 'regex':
                try { this.testMatch = new RegExp(p, 'i').test(h); } catch { this.testMatch = false; }
                break;
        }
    }

    openAddSheet() {
        this.editingRule = null;
        this.form = this.blankForm();
        this.testText = '';
        this.testMatch = false;
        this.sheetOpen = true;
    }

    openEditSheet(rule: MerchantRule) {
        this.editingRule = rule;
        this.form = {
            pattern: rule.pattern, matchType: rule.matchType,
            category: rule.category, subcategory: rule.subcategory || '',
            priority: rule.priority, enabled: rule.enabled
        };
        this.testText = '';
        this.testMatch = false;
        this.sheetOpen = true;
    }

    closeSheet() { this.sheetOpen = false; }

    async saveRule() {
        if (!this.form.pattern.trim() || !this.form.category) return;
        this.saving = true;
        try {
            const payload = {
                pattern: this.form.pattern.trim().toLowerCase(),
                matchType: this.form.matchType,
                category: this.form.category,
                subcategory: this.form.subcategory || undefined,
                priority: Number(this.form.priority) || 0,
                enabled: this.form.enabled,
                hitCount: this.editingRule?.hitCount ?? 0,
            };
            if (this.editingRule?.id) {
                await this.rulesService.updateRule(this.editingRule.id, payload);
                this.toast('Rule updated ✓');
            } else {
                await this.rulesService.addRule(payload);
                this.toast('Rule created ✓');
            }
            this.closeSheet();
        } catch (e: any) {
            this.toast('Failed: ' + e.message, true);
        } finally {
            this.saving = false;
        }
    }

    async toggleRule(rule: MerchantRule, ev: any) {
        await this.rulesService.toggleRule(rule.id!, ev.detail.checked);
    }

    async deleteRule(rule: MerchantRule) {
        const alert = await this.alertCtrl.create({
            header: 'Delete rule?',
            message: `"${rule.pattern}" will be removed. Existing transactions are not affected.`,
            buttons: [
                { text: 'Cancel', role: 'cancel' },
                {
                    text: 'Delete', role: 'destructive', handler: async () => {
                        await this.rulesService.deleteRule(rule.id!);
                        this.toast('Rule deleted');
                    }
                }
            ]
        });
        await alert.present();
    }

    private async toast(msg: string, error = false) {
        const t = await this.toastCtrl.create({
            message: msg, duration: 2500, position: 'bottom',
            color: error ? 'danger' : 'success'
        });
        await t.present();
    }
}