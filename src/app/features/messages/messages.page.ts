// ─── src/app/features/messages/messages.page.ts ─
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, IonInfiniteScroll } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SmsReaderService } from '../../core/services/sms-reader.service';
import { SmsParserService } from '../../core/services/sms-parser.service';
import { BudgetService } from '../../core/services/budget.service';
import { ParsedSMS, CategoryKey, DEFAULT_BUDGET_CATEGORIES } from '../../core/models';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { format, isToday, isYesterday } from 'date-fns';

// ── Message model ──────────────────────────────
export type MessageCategory = 'personal' | 'transactions' | 'promotions' | 'reminders';

export interface SmsMessage {
  id: string;
  sender: string;
  senderDisplay: string;
  body: string;
  date: Date;
  category: MessageCategory;
  isRead: boolean;
  isArchived: boolean;
  parsed?: ParsedSMS;
  importCategory?: CategoryKey;
  importSubcategory?: string;
  imported?: boolean;
  importedCategory?: string;
  importedSubcategory?: string;
}

// ── Classifier patterns ────────────────────────
const TRANSACTION_PATTERNS = [
  /debited|credited|debit|credit/i,
  /INR|Rs\.|₹/,
  /UPI|NEFT|IMPS|RTGS|ATM/i,
  /A\/c|account|acct/i,
  /balance|avl bal/i,
  /payment|txn|transaction/i,
];
const PROMO_PATTERNS = [
  /offer|discount|sale|deal|cashback|coupon|voucher/i,
  /off on|% off|flat ₹|save ₹/i,
  /limited time|expires|valid till|last chance/i,
  /click here|shop now|buy now|order now/i,
  /congratulations|you.?ve won|lucky draw/i,
  /subscribe|unsubscribe|opt.?out/i,
];
const REMINDER_PATTERNS = [
  /due date|due on|overdue|payment due/i,
  /emi|loan|insurance premium/i,
  /reminder|kindly pay|please pay/i,
  /bill|invoice|statement/i,
  /appointment|booking|scheduled|confirm/i,
  /recharge|expir|renew/i,
  /otp|one.?time|verification code/i,
];

const PAGE_SIZE = 50;

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, InrPipe],
  template: `
    <ion-content [fullscreen]="true" [scrollEvents]="true">
      <div class="msg-wrap">

        <!-- ── Header ── -->
        <div class="msg-header">
          <div class="header-row">
            <div>
              <h1 class="header-title">Messages</h1>
              <p class="header-sub">{{ totalUnread }} unread · {{ allMessages.length }} total</p>
            </div>
            <button class="refresh-btn" (click)="reload()" [class.spinning]="loading">
              <ion-icon name="refresh-outline"></ion-icon>
            </button>
          </div>

          <!-- Search -->
          <div class="search-wrap" [class.focused]="searchFocused">
            <ion-icon name="search-outline" class="search-icon"></ion-icon>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search messages…"
              class="search-input"
              (focus)="searchFocused = true"
              (blur)="searchFocused = false"
              (ngModelChange)="onSearch()"
            />
            <button class="search-clear" *ngIf="searchQuery" (click)="clearSearch()">
              <ion-icon name="close-circle" style="font-size:18px;color:rgba(255,255,255,0.6)"></ion-icon>
            </button>
          </div>

          <!-- Segments -->
          <div class="segments-row">
            <button class="seg-btn" *ngFor="let seg of segments"
              [class.active]="activeSegment === seg.key"
              (click)="setSegment(seg.key)">
              <span class="seg-icon">{{ seg.icon }}</span>
              <span class="seg-label">{{ seg.label }}</span>
              <span class="seg-badge" *ngIf="getUnread(seg.key) > 0">
                {{ getUnread(seg.key) > 99 ? '99+' : getUnread(seg.key) }}
              </span>
            </button>
          </div>
        </div>

        <!-- ── Platform notice ── -->
        <div class="platform-notice" *ngIf="!isAndroid && !loading && allMessages.length > 0">
          <ion-icon name="information-circle-outline"></ion-icon>
          <span>SMS reading requires Android app — showing demo data</span>
        </div>

        <!-- ── Initial Loading Skeletons ── -->
        <div class="skel-list" *ngIf="loading">
          <div class="skel-item" *ngFor="let n of [1,2,3,4,5,6,7,8]">
            <div class="skeleton skel-avatar"></div>
            <div class="skel-body">
              <div class="skel-row">
                <div class="skeleton" style="height:13px;width:110px;border-radius:4px"></div>
                <div class="skeleton" style="height:11px;width:48px;border-radius:4px"></div>
              </div>
              <div class="skeleton" style="height:11px;width:220px;border-radius:4px;margin-top:6px"></div>
              <div class="skeleton" style="height:11px;width:160px;border-radius:4px;margin-top:4px"></div>
            </div>
          </div>
        </div>

        <!-- ── Empty State ── -->
        <div class="empty-state" *ngIf="!loading && visibleMessages.length === 0">
          <div class="empty-emoji">{{ activeSegmentMeta.emptyIcon }}</div>
          <h3>{{ searchQuery ? 'No results' : 'No ' + activeSegmentMeta.label + ' messages' }}</h3>
          <p>{{ searchQuery ? 'Try a different search term' : activeSegmentMeta.emptyText }}</p>
          <button class="empty-load-btn" *ngIf="!searchQuery && allMessages.length === 0" (click)="reload()">
            <ion-icon name="refresh-outline"></ion-icon>
            Load Messages
          </button>
        </div>

        <!-- ── Message List ── -->
        <div class="msg-list" *ngIf="!loading && visibleMessages.length > 0">

          <!-- Count bar -->
          <div class="count-bar">
            <span class="count-text">
              Showing {{ visibleMessages.length }} of {{ filteredMessages.length }}
              <span class="days-badge" *ngIf="daysLoaded <= 30">
                {{ daysLoaded === 1 ? 'Today' : 'Last ' + daysLoaded + ' days' }}
              </span>
            </span>
            <span class="loading-more-text" *ngIf="loadingMore">
              <ion-spinner name="dots" style="width:14px;height:14px;--color:var(--muted)"></ion-spinner>
              loading older…
            </span>
            <button class="mark-all-btn" *ngIf="getUnread(activeSegment) > 0 && !loadingMore" (click)="markAllRead()">
              <ion-icon name="checkmark-done-outline"></ion-icon>
              Mark all read
            </button>
          </div>

          <div class="msg-item-wrap"
            *ngFor="let msg of visibleMessages; let i = index; trackBy: trackById"
            [style.animation-delay]="getDelay(i)">

            <ion-item-sliding #slidingItem>

              <!-- Swipe left → archive -->
              <ion-item-options side="start">
                <ion-item-option color="medium" (click)="archiveMessage(msg, slidingItem)">
                  <ion-icon slot="icon-only" name="archive-outline"></ion-icon>
                </ion-item-option>
              </ion-item-options>

              <ion-item lines="none" class="msg-item-ion">
                <div class="msg-card" [class.unread]="!msg.isRead" (click)="openMessage(msg)">
                  <div class="msg-avatar" [style.background]="getAvatarBg(msg.category)">
                    <span class="avatar-letter">{{ msg.senderDisplay[0].toUpperCase() }}</span>
                    <div class="unread-dot" *ngIf="!msg.isRead"></div>
                  </div>
                  <div class="msg-body">
                    <div class="msg-top-row">
                      <span class="msg-sender" [class.bold]="!msg.isRead">{{ msg.senderDisplay }}</span>
                      <span class="msg-time">{{ formatTime(msg.date) }}</span>
                    </div>
                    <div class="msg-preview" [class.bold-preview]="!msg.isRead">
                      {{ msg.body | slice:0:80 }}{{ msg.body.length > 80 ? '…' : '' }}
                    </div>
                    <div class="txn-pill" *ngIf="msg.category === 'transactions' && msg.parsed">
                      <span class="pill-amount" [class.debit]="msg.parsed.type === 'debit'" [class.credit]="msg.parsed.type === 'credit'">
                        {{ msg.parsed.type === 'debit' ? '−' : '+' }}{{ msg.parsed.amount | inr }}
                      </span>
                      <span class="pill-bank">{{ msg.parsed.bank }}</span>
                      <span class="pill-conf" [class]="'conf-' + msg.parsed.confidence">{{ msg.parsed.confidence }}</span>
                      <span class="pill-imported" *ngIf="msg.imported">✓ imported</span>
                    </div>
                  </div>
                </div>
              </ion-item>

              <!-- Swipe right → delete -->
              <ion-item-options side="end">
                <ion-item-option color="danger" (click)="deleteMessage(msg, slidingItem)">
                  <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                </ion-item-option>
              </ion-item-options>

            </ion-item-sliding>
          </div>

          <!-- ── Infinite Scroll ── -->
          <ion-infinite-scroll
            #infiniteScroll
            threshold="200px"
            (ionInfinite)="loadMore($event)"
            [disabled]="visibleMessages.length >= filteredMessages.length">
            <ion-infinite-scroll-content
              loadingSpinner="crescent"
              loadingText="Loading more messages…">
            </ion-infinite-scroll-content>
          </ion-infinite-scroll>

          <!-- All loaded indicator -->
          <div class="all-loaded" *ngIf="visibleMessages.length >= filteredMessages.length && filteredMessages.length > 0">
            <div class="all-loaded-line"></div>
            <span class="all-loaded-text">All {{ filteredMessages.length }} messages loaded</span>
            <div class="all-loaded-line"></div>
          </div>

        </div>

        <div style="height:100px"></div>
      </div>

      <!-- ── Message Detail Sheet ── -->
      <div class="detail-overlay" [class.open]="!!selectedMsg" (click)="closeDetail()">
        <div class="detail-sheet" (click)="$event.stopPropagation()" *ngIf="selectedMsg">
          <div class="sheet-handle"></div>

          <div class="detail-header">
            <div class="detail-avatar" [style.background]="getAvatarBg(selectedMsg.category)">
              {{ selectedMsg.senderDisplay[0].toUpperCase() }}
            </div>
            <div class="detail-sender-info">
              <div class="detail-sender">{{ selectedMsg.senderDisplay }}</div>
              <div class="detail-date">{{ selectedMsg.date | date:'EEEE, dd MMM yyyy · h:mm a' }}</div>
            </div>
            <div class="detail-cat-badge"
              [style.background]="getCatBadgeBg(selectedMsg.category)"
              [style.color]="getCatBadgeColor(selectedMsg.category)">
              {{ getCatMeta(selectedMsg.category).icon }} {{ getCatMeta(selectedMsg.category).label }}
            </div>
          </div>

          <div class="detail-body">{{ selectedMsg.body }}</div>

          <!-- Transaction import panel -->
          <ng-container *ngIf="selectedMsg.category === 'transactions' && selectedMsg.parsed">
            <div class="txn-detail-card">
              <div class="txn-detail-title">Transaction Details</div>
              <div class="txn-detail-grid">
                <div class="td-item">
                  <div class="td-label">Amount</div>
                  <div class="td-val"
                    [style.color]="selectedMsg.parsed.type === 'debit' ? '#ef4444' : '#10b981'"
                    style="font-size:22px;font-weight:800">
                    {{ selectedMsg.parsed.type === 'debit' ? '−' : '+' }}{{ selectedMsg.parsed.amount | inr }}
                  </div>
                </div>
                <div class="td-item">
                  <div class="td-label">Type</div>
                  <div class="td-val">
                    <span class="type-badge" [class.debit]="selectedMsg.parsed.type === 'debit'" [class.credit]="selectedMsg.parsed.type === 'credit'">
                      {{ selectedMsg.parsed.type | titlecase }}
                    </span>
                  </div>
                </div>
                <div class="td-item" *ngIf="selectedMsg.parsed.bank !== 'Unknown Bank'">
                  <div class="td-label">Bank</div>
                  <div class="td-val">{{ selectedMsg.parsed.bank }}</div>
                </div>
                <div class="td-item" *ngIf="selectedMsg.parsed.merchant">
                  <div class="td-label">Merchant</div>
                  <div class="td-val">{{ selectedMsg.parsed.merchant }}</div>
                </div>
                <div class="td-item" *ngIf="selectedMsg.parsed.accountLast4">
                  <div class="td-label">Account</div>
                  <div class="td-val">•••• {{ selectedMsg.parsed.accountLast4 }}</div>
                </div>
                <div class="td-item">
                  <div class="td-label">Confidence</div>
                  <div class="td-val">
                    <span class="conf-badge" [class]="'conf-' + selectedMsg.parsed.confidence">
                      {{ selectedMsg.parsed.confidence | titlecase }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="already-imported" *ngIf="selectedMsg.imported">
                <ion-icon name="checkmark-circle"></ion-icon>
                <div>
                  <div>Added to budget</div>
                  <div class="imported-detail" *ngIf="selectedMsg.importedCategory">
                    {{ selectedMsg.importedCategory }}
                    <span *ngIf="selectedMsg.importedSubcategory"> · {{ selectedMsg.importedSubcategory }}</span>
                  </div>
                </div>
              </div>

              <ng-container *ngIf="!selectedMsg.imported">
                <!-- Step 1: Category -->
                <div class="import-step">
                  <div class="import-step-label">
                    <span class="step-num">1</span> Choose category
                  </div>
                  <div class="cat-grid">
                    <button class="cat-chip-btn"
                      *ngFor="let cat of importCategories"
                      [class.active]="selectedMsg.importCategory === cat.key"
                      (click)="selectCategory(selectedMsg, cat.key)"
                      [style.border-color]="selectedMsg.importCategory === cat.key ? cat.color : 'transparent'"
                      [style.background]="selectedMsg.importCategory === cat.key ? cat.color + '18' : '#f9fafb'">
                      <span class="cat-chip-icon">{{ cat.icon }}</span>
                      <span class="cat-chip-name" [style.color]="selectedMsg.importCategory === cat.key ? cat.color : '#6b7280'">
                        {{ cat.shortName }}
                      </span>
                    </button>
                  </div>
                </div>

                <!-- Step 2: Subcategory (appears after category picked) -->
                <div class="import-step subcategory-step"
                  *ngIf="selectedMsg.importCategory"
                  [class.slide-in]="!!selectedMsg.importCategory">
                  <div class="import-step-label">
                    <span class="step-num">2</span> Choose subcategory
                  </div>
                  <div class="sub-grid">
                    <button class="sub-chip-btn"
                      *ngFor="let sub of getSubcategories(selectedMsg.importCategory)"
                      [class.active]="selectedMsg.importSubcategory === sub.name"
                      (click)="selectedMsg.importSubcategory = sub.name">
                      <span class="sub-chip-name">{{ sub.name }}</span>
                      <span class="sub-chip-limit">{{ sub.limit | inr:true }}</span>
                    </button>
                    <button class="sub-chip-btn skip-sub"
                      [class.active]="selectedMsg.importSubcategory === '__skip__'"
                      (click)="selectedMsg.importSubcategory = '__skip__'">
                      <span class="sub-chip-name">Skip subcategory</span>
                    </button>
                  </div>
                </div>

                <!-- Confirm button -->
                <button class="import-btn"
                  *ngIf="selectedMsg.importCategory && selectedMsg.importSubcategory"
                  (click)="importTransaction()"
                  [disabled]="importing">
                  <ion-spinner *ngIf="importing" name="crescent" style="width:16px;height:16px;--color:white"></ion-spinner>
                  <ion-icon *ngIf="!importing" name="add-circle-outline"></ion-icon>
                  <span *ngIf="!importing">Add to Budget</span>
                </button>
              </ng-container>
            </div>
          </ng-container>

          <div class="detail-actions">
            <button class="da-btn da-read" (click)="toggleRead(selectedMsg)">
              <ion-icon [name]="selectedMsg.isRead ? 'mail-unread-outline' : 'mail-open-outline'"></ion-icon>
              {{ selectedMsg.isRead ? 'Mark unread' : 'Mark read' }}
            </button>
            <button class="da-btn da-archive" (click)="archiveMessage(selectedMsg, null)">
              <ion-icon name="archive-outline"></ion-icon>
              Archive
            </button>
            <button class="da-btn da-delete" (click)="deleteMessage(selectedMsg, null)">
              <ion-icon name="trash-outline"></ion-icon>
              Delete
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: #f3f4f6; }
    .msg-wrap { background: #f3f4f6; min-height: 100vh; }

    /* ── Header ── */
    .msg-header {
      background: linear-gradient(160deg, #7c3aed 0%, #5b21b6 100%);
      padding: 52px 16px 0;
      border-radius: 0 0 28px 28px;
      margin-bottom: 8px;
    }
    .header-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
    .header-title { font-family:'Inter',sans-serif; font-size:26px; font-weight:800; color:white; margin-bottom:2px; }
    .header-sub { font-size:12px; color:rgba(255,255,255,0.65); }
    .refresh-btn {
      width:38px; height:38px; border-radius:50%; border:none;
      background:rgba(255,255,255,0.15); color:white; font-size:18px;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer;
      transition:transform 0.4s;
      &.spinning { animation: spin 0.8s linear infinite; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Search */
    .search-wrap {
      display:flex; align-items:center;
      background:rgba(255,255,255,0.15); backdrop-filter:blur(10px);
      border:1.5px solid rgba(255,255,255,0.2);
      border-radius:14px; padding:0 14px; margin-bottom:16px;
      transition:background 0.2s, border-color 0.2s;
      &.focused { background:rgba(255,255,255,0.25); border-color:rgba(255,255,255,0.5); }
    }
    .search-icon { color:rgba(255,255,255,0.7); font-size:17px; flex-shrink:0; }
    .search-input {
      flex:1; background:transparent; border:none; outline:none;
      color:white; font-family:'Inter',sans-serif; font-size:14px; padding:11px 10px;
      &::placeholder { color:rgba(255,255,255,0.5); }
    }
    .search-clear { background:transparent; border:none; cursor:pointer; display:flex; align-items:center; }

    /* Segments */
    .segments-row { display:flex; gap:4px; overflow-x:auto; &::-webkit-scrollbar { display:none; } }
    .seg-btn {
      flex:1; min-width:72px;
      display:flex; flex-direction:column; align-items:center; gap:4px;
      padding:10px 8px 0; border:none; background:transparent; cursor:pointer;
      position:relative; border-bottom:3px solid transparent; transition:border-color 0.2s;
    }
    .seg-icon { font-size:18px; }
    .seg-label { font-family:'Inter',sans-serif; font-size:11px; font-weight:600; color:rgba(255,255,255,0.6); white-space:nowrap; }
    .seg-badge {
      position:absolute; top:4px; right:8px;
      background:#ef4444; color:white; font-size:9px; font-weight:800;
      padding:1px 5px; border-radius:20px; min-width:16px; text-align:center;
    }
    .seg-btn.active { border-bottom-color:white; .seg-label { color:white; font-weight:800; } }

    /* Platform notice */
    .platform-notice {
      display:flex; align-items:center; gap:8px;
      margin:8px 16px;
      background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2);
      border-radius:12px; padding:10px 14px; font-size:12px; color:#3b82f6;
    }
    .platform-notice ion-icon { font-size:16px; flex-shrink:0; }

    /* Skeletons */
    .skel-list { padding:8px 16px; }
    .skel-item { display:flex; gap:12px; padding:14px; background:white; border-radius:16px; margin-bottom:8px; }
    .skel-avatar { width:46px; height:46px; border-radius:14px; flex-shrink:0; }
    .skel-body { flex:1; }
    .skel-row { display:flex; justify-content:space-between; margin-bottom:0; }
    .skeleton {
      background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%);
      background-size:200% 100%; animation:shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

    /* Empty */
    .empty-state { text-align:center; padding:60px 24px;
      .empty-emoji { font-size:52px; margin-bottom:16px; display:block; }
      h3 { font-family:'Inter',sans-serif; font-size:18px; font-weight:800; color:#374151; margin-bottom:8px; }
      p { font-size:13px; color:#9ca3af; margin-bottom:24px; line-height:1.5; }
    }
    .empty-load-btn {
      display:inline-flex; align-items:center; gap:8px;
      background:linear-gradient(135deg,#7c3aed,#6d28d9); color:white;
      border:none; border-radius:14px; padding:13px 24px;
      font-family:'Inter',sans-serif; font-size:14px; font-weight:700;
      cursor:pointer; box-shadow:0 8px 24px rgba(109,40,217,0.3);
    }

    /* Count bar */
    .count-bar {
      display:flex; justify-content:space-between; align-items:center;
      padding:8px 16px 6px;
    }
    .count-text { font-size:11px; color:#9ca3af; font-weight:500; }
    .days-badge { background: rgba(124,58,237,0.12); color: #7c3aed; font-size: 9px; font-weight: 800; padding: 1px 7px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 6px; }
    .loading-more-text { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #9ca3af; }
    .mark-all-btn {
      display:flex; align-items:center; gap:5px;
      background:transparent; border:none;
      font-size:12px; font-weight:600; color:#7c3aed; cursor:pointer;
    }
    .mark-all-btn ion-icon { font-size:15px; }

    /* Message list */
    .msg-list { padding:0 16px; }
    .msg-item-wrap { animation:fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both; margin-bottom:8px; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

    ion-item-sliding { border-radius:16px; overflow:hidden; }
    ion-item-option { font-size:22px; }
    .msg-item-ion { --padding-start:0; --inner-padding-end:0; --background:transparent; }

    .msg-card {
      display:flex; align-items:flex-start; gap:12px;
      background:white; border-radius:16px; padding:14px;
      width:100%; cursor:pointer;
      box-shadow:0 1px 6px rgba(0,0,0,0.05);
      transition:transform 0.15s;
      &:active { transform:scale(0.98); }
      &.unread { border-left:3px solid #7c3aed; }
    }
    .msg-avatar { width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative; }
    .avatar-letter { font-family:'Inter',sans-serif; font-size:18px; font-weight:800; color:white; }
    .unread-dot { position:absolute; top:-2px; right:-2px; width:10px; height:10px; border-radius:50%; background:#7c3aed; border:2px solid white; }
    .msg-body { flex:1; min-width:0; }
    .msg-top-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; }
    .msg-sender { font-size:13px; color:#374151; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; }
    .msg-sender.bold { font-weight:700; color:#111827; }
    .msg-time { font-size:11px; color:#9ca3af; flex-shrink:0; }
    .msg-preview { font-size:12px; color:#9ca3af; line-height:1.4; }
    .msg-preview.bold-preview { color:#374151; }

    /* Transaction pill */
    .txn-pill { display:flex; align-items:center; gap:6px; margin-top:6px; flex-wrap:wrap; }
    .pill-amount { font-family:'Inter',sans-serif; font-size:13px; font-weight:800; &.debit{color:#ef4444} &.credit{color:#10b981} }
    .pill-bank { background:#f3f4f6; color:#6b7280; padding:1px 7px; border-radius:20px; font-size:10px; font-weight:600; }
    .pill-conf { padding:1px 7px; border-radius:20px; font-size:10px; font-weight:700;
      &.conf-high{background:#d1fae5;color:#065f46}
      &.conf-medium{background:#fef3c7;color:#92400e}
      &.conf-low{background:#fee2e2;color:#991b1b}
    }
    .pill-imported { background:#ede9fe; color:#7c3aed; padding:1px 8px; border-radius:20px; font-size:10px; font-weight:700; }

    /* All loaded */
    .all-loaded {
      display:flex; align-items:center; gap:10px;
      padding:16px 0 8px; margin-bottom:4px;
    }
    .all-loaded-line { flex:1; height:1px; background:#e5e7eb; }
    .all-loaded-text { font-size:11px; color:#9ca3af; white-space:nowrap; font-weight:500; }

    /* ── Detail Sheet ── */
    .detail-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0);
      z-index:200; pointer-events:none;
      display:flex; align-items:flex-end; transition:background 0.3s;
      &.open { background:rgba(0,0,0,0.45); pointer-events:all; }
    }
    .detail-sheet {
      width:100%; max-width:480px; margin:0 auto;
      background:white; border-radius:28px 28px 0 0;
      padding:16px 20px 40px;
      transform:translateY(100%);
      transition:transform 0.38s cubic-bezier(0.16,1,0.3,1);
      max-height:92vh; overflow-y:auto;
    }
    .detail-overlay.open .detail-sheet { transform:translateY(0); }
    .sheet-handle { width:40px; height:4px; border-radius:2px; background:#e5e7eb; margin:0 auto 18px; }
    .detail-header { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
    .detail-avatar { width:46px; height:46px; border-radius:14px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif; font-size:18px; font-weight:800; color:white; }
    .detail-sender-info { flex:1; }
    .detail-sender { font-size:15px; font-weight:700; color:#111827; }
    .detail-date { font-size:11px; color:#9ca3af; margin-top:2px; }
    .detail-cat-badge { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; flex-shrink:0; }
    .detail-body { background:#f9fafb; border-radius:14px; padding:14px; font-size:13px; color:#374151; line-height:1.6; margin-bottom:16px; border:1px solid #f3f4f6; }

    .txn-detail-card { background:#f9fafb; border-radius:16px; padding:16px; margin-bottom:16px; border:1px solid #f3f4f6; }
    .txn-detail-title { font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:14px; }
    .txn-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
    .td-label { font-size:11px; color:#9ca3af; margin-bottom:3px; }
    .td-val { font-size:14px; font-weight:600; color:#111827; }
    .type-badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; &.debit{background:#fee2e2;color:#ef4444} &.credit{background:#d1fae5;color:#10b981} }
    .conf-badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; &.conf-high{background:#d1fae5;color:#065f46} &.conf-medium{background:#fef3c7;color:#92400e} &.conf-low{background:#fee2e2;color:#991b1b} }
    .already-imported { display:flex; align-items:center; gap:10px; background:#d1fae5; color:#065f46; border-radius:12px; padding:12px 14px; font-size:13px; font-weight:600; }
    .already-imported ion-icon { font-size:22px; flex-shrink:0; }
    .imported-detail { font-size:11px; font-weight:500; color:#047857; margin-top:2px; }
    .import-step { margin-bottom:14px; }
    .import-step-label { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px; }
    .step-num { width:18px; height:18px; border-radius:50%; background:#6366f1; color:white; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .cat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
    .cat-chip-btn { border:2px solid transparent; border-radius:12px; padding:8px 4px; display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer; transition:all 0.18s; background:#f9fafb; }
    .cat-chip-btn.active { transform:scale(1.05); }
    .cat-chip-icon { font-size:18px; }
    .cat-chip-name { font-size:9px; font-weight:700; text-align:center; }
    .subcategory-step { animation:fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) both; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .sub-grid { display:flex; flex-direction:column; gap:6px; }
    .sub-chip-btn { display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border:1.5px solid #e5e7eb; border-radius:12px; background:#f9fafb; cursor:pointer; transition:all 0.18s; }
    .sub-chip-btn.active { border-color:#6366f1; background:rgba(99,102,241,0.08); }
    .sub-chip-btn.skip-sub { border-style:dashed; }
    .sub-chip-btn.skip-sub.active { border-color:#9ca3af; background:rgba(156,163,175,0.08); }
    .sub-chip-name { font-size:13px; font-weight:600; color:#374151; }
    .sub-chip-btn.active .sub-chip-name { color:#4f46e5; }
    .sub-chip-limit { font-size:11px; font-weight:700; color:#9ca3af; }
    .import-btn { width:100%; padding:14px; border-radius:14px; border:none; background:linear-gradient(135deg,#7c3aed,#6d28d9); color:white; font-family:'Inter',sans-serif; font-size:14px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; box-shadow:0 6px 20px rgba(109,40,217,0.3); &:disabled{opacity:0.6;cursor:not-allowed} }
    .detail-actions { display:flex; gap:8px; margin-top:4px; }
    .da-btn { flex:1; padding:12px 8px; border-radius:14px; border:1.5px solid #e5e7eb; background:white; cursor:pointer; font-family:'Inter',sans-serif; font-size:12px; font-weight:700; display:flex; flex-direction:column; align-items:center; gap:4px; transition:all 0.15s; ion-icon{font-size:18px} &:active{transform:scale(0.96)} }
    .da-read { color:#7c3aed; ion-icon{color:#7c3aed} }
    .da-archive { color:#6b7280; ion-icon{color:#6b7280} }
    .da-delete { color:#ef4444; border-color:#fee2e2; background:#fff5f5; ion-icon{color:#ef4444} }
  `]
})
export class MessagesPage implements OnInit {
  @ViewChild('infiniteScroll') infiniteScroll!: IonInfiniteScroll;

  // All messages (full dataset for active segment)
  allMessages: SmsMessage[] = [];
  // Filtered by segment + search
  filteredMessages: SmsMessage[] = [];
  // Currently visible slice (for infinite scroll)
  visibleMessages: SmsMessage[] = [];

  currentPage = 1;
  activeSegment: MessageCategory = 'transactions';
  searchQuery = '';
  searchFocused = false;
  loading = false;
  loadingMore = false;   // background load for older days
  daysLoaded = 1;        // track how many days of SMS we've loaded
  selectedMsg: SmsMessage | null = null;
  importing = false;

  readonly segments = [
    { key: 'personal' as MessageCategory, icon: '👤', label: 'Personal', emptyIcon: '👤', emptyText: 'No personal messages' },
    { key: 'transactions' as MessageCategory, icon: '💳', label: 'Transactions', emptyIcon: '💳', emptyText: 'No transaction messages' },
    { key: 'promotions' as MessageCategory, icon: '🏷️', label: 'Promotions', emptyIcon: '🏷️', emptyText: 'No promotional messages' },
    { key: 'reminders' as MessageCategory, icon: '🔔', label: 'Reminders', emptyIcon: '🔔', emptyText: 'No reminders found' },
  ];

  readonly importCategories = [
    { key: 'fixed_costs' as CategoryKey, icon: '🏦', shortName: 'Fixed', color: '#f5c842' },
    { key: 'food_household' as CategoryKey, icon: '🛒', shortName: 'Food', color: '#60a5fa' },
    { key: 'savings' as CategoryKey, icon: '💰', shortName: 'Savings', color: '#10b981' },
    { key: 'self_investment' as CategoryKey, icon: '🌿', shortName: 'Growth', color: '#a78bfa' },
    { key: 'fun_family' as CategoryKey, icon: '🎉', shortName: 'Fun', color: '#fb923c' },
    { key: 'giving_misc' as CategoryKey, icon: '💖', shortName: 'Giving', color: '#f472b6' },
    { key: 'uncategorized' as CategoryKey, icon: '❓', shortName: 'Other', color: '#9ca3af' },
  ];

  constructor(
    private smsReader: SmsReaderService,
    private smsParser: SmsParserService,
    private budgetService: BudgetService,
    private toastCtrl: ToastController
  ) { }

  get isAndroid(): boolean { return this.smsReader.isPlatformAndroid; }
  get totalUnread(): number { return this.allMessages.filter(m => !m.isRead && !m.isArchived).length; }
  get activeSegmentMeta() { return this.segments.find(s => s.key === this.activeSegment)!; }

  ngOnInit() { this.reload(); }

  // ── Step 1: Load only TODAY (instant, ~10-30ms) ──────────────
  async reload() {
    this.loading = true;
    this.allMessages = [];
    this.filteredMessages = [];
    this.visibleMessages = [];
    this.currentPage = 1;
    this.daysLoaded = 1;
    this.smsReader.clearCache();

    try {
      const raw = await this.smsReader.readTodaySMS();
      this.allMessages = raw.map((sms, i) => this.buildMessage(sms, i));
      this.applyFilter();
    } finally {
      this.loading = false;
      // Step 2: silently load last 7 days in background after UI renders
      setTimeout(() => this.loadOlderSMS(7), 100);
    }
  }

  // ── Background loader: extends history silently ───────────────
  private async loadOlderSMS(days: number) {
    if (this.loadingMore) return;
    this.loadingMore = true;
    try {
      const raw = await this.smsReader.readLastNDays(days, 500);
      const existingIds = new Set(this.allMessages.map(m => m.id));
      const newMsgs = raw
        .map((sms, i) => this.buildMessage(sms, this.allMessages.length + i))
        .filter(m => !existingIds.has(m.id));
      if (newMsgs.length > 0) {
        this.allMessages = [...this.allMessages, ...newMsgs];
        this.daysLoaded = days;
        this.applyFilter();
      }
      // Auto-extend to 30 days after 7 days loads
      if (days === 7) setTimeout(() => this.loadOlderSMS(30), 500);
    } finally {
      this.loadingMore = false;
    }
  }

  // ── Infinite scroll: render more rows, then fetch more days ───
  async loadMore(event: any) {
    await new Promise(r => setTimeout(r, 250));

    // First: render next page of already-loaded messages
    if (this.visibleMessages.length < this.filteredMessages.length) {
      this.currentPage++;
      this.visibleMessages = this.filteredMessages.slice(0, this.currentPage * PAGE_SIZE);
      event.target.complete();
      if (this.visibleMessages.length >= this.filteredMessages.length) {
        event.target.disabled = true;
      }
      return;
    }

    // Then: fetch older SMS history (30 → 90 days)
    if (this.daysLoaded < 90) {
      const nextDays = this.daysLoaded >= 30 ? 90 : 30;
      await this.loadOlderSMS(nextDays);
      this.currentPage = 1;
      this.applyFilter();
    }

    event.target.complete();
    if (this.daysLoaded >= 90) event.target.disabled = true;
  }

  // ── Build message object from raw SMS ────────────────────────
  private buildMessage(raw: { body: string; address: string; date: number }, i: number): SmsMessage {
    const category = this.classify(raw.body, raw.address);
    const parsed = category === 'transactions'
      ? this.smsParser.parseSMS(raw.body, raw.address)
      : undefined;

    return {
      id: `msg-${i}-${raw.date}`,
      sender: raw.address,
      senderDisplay: this.formatSender(raw.address),
      body: raw.body,
      date: new Date(raw.date),
      category,
      isRead: false,
      isArchived: false,
      parsed: parsed?.isValid ? parsed : undefined,
      importCategory: parsed ? this.smsParser.autoCategory(parsed) : undefined,
    };
  }

  private classify(body: string, sender: string): MessageCategory {
    const txnScore = TRANSACTION_PATTERNS.filter(p => p.test(body)).length;
    if (txnScore >= 2) return 'transactions';
    if (REMINDER_PATTERNS.some(p => p.test(body))) return 'reminders';
    if (PROMO_PATTERNS.some(p => p.test(body))) return 'promotions';
    if (/^\d+$/.test(sender)) return 'promotions';
    return 'personal';
  }

  private formatSender(raw: string): string {
    if (!raw) return 'Unknown';
    if (/^[A-Z]{2}-/.test(raw)) return raw.split('-')[1];
    if (raw.length <= 8 && /[A-Z]/.test(raw)) return raw;
    if (raw.length >= 10) return raw.replace(/(\d{2})\d+(\d{4})/, '$1••••$2');
    return raw;
  }

  // ── Filter, sort, reset pagination ───────────────────────────
  applyFilter() {
    let msgs = this.allMessages.filter(m => m.category === this.activeSegment && !m.isArchived);

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      msgs = msgs.filter(m =>
        m.senderDisplay.toLowerCase().includes(q) || m.body.toLowerCase().includes(q)
      );
    }

    // Sort: unread first, then newest first
    this.filteredMessages = msgs.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return b.date.getTime() - a.date.getTime();
    });

    // Reset to first page
    this.currentPage = 1;
    this.visibleMessages = this.filteredMessages.slice(0, PAGE_SIZE);

    // Re-enable infinite scroll for new segment/search
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = this.visibleMessages.length >= this.filteredMessages.length;
    }
  }

  setSegment(seg: MessageCategory) {
    this.activeSegment = seg;
    this.searchQuery = '';
    this.applyFilter();
  }

  onSearch() { this.applyFilter(); }
  clearSearch() { this.searchQuery = ''; this.applyFilter(); }

  getUnread(seg: MessageCategory): number {
    return this.allMessages.filter(m => m.category === seg && !m.isRead && !m.isArchived).length;
  }

  // ── Message actions ───────────────────────────────────────────
  openMessage(msg: SmsMessage) {
    msg.isRead = true;
    this.selectedMsg = { ...msg };
    if (this.selectedMsg.category === 'transactions' && this.selectedMsg.parsed && !this.selectedMsg.importCategory) {
      this.selectedMsg.importCategory = this.smsParser.autoCategory(this.selectedMsg.parsed);
    }
  }

  closeDetail() {
    if (this.selectedMsg) {
      const orig = this.allMessages.find(m => m.id === this.selectedMsg!.id);
      if (orig) orig.isRead = this.selectedMsg.isRead;
    }
    this.selectedMsg = null;
    this.applyFilter();
  }

  toggleRead(msg: SmsMessage) {
    msg.isRead = !msg.isRead;
    const orig = this.allMessages.find(m => m.id === msg.id);
    if (orig) orig.isRead = msg.isRead;
  }

  markAllRead() {
    this.allMessages.filter(m => m.category === this.activeSegment).forEach(m => m.isRead = true);
    this.applyFilter();
  }

  archiveMessage(msg: SmsMessage, slider: any) {
    slider?.close();
    const orig = this.allMessages.find(m => m.id === msg.id);
    if (orig) orig.isArchived = true;
    if (this.selectedMsg?.id === msg.id) this.selectedMsg = null;
    this.applyFilter();
    this.showToast('Message archived');
  }

  deleteMessage(msg: SmsMessage, slider: any) {
    slider?.close();
    this.allMessages = this.allMessages.filter(m => m.id !== msg.id);
    if (this.selectedMsg?.id === msg.id) this.selectedMsg = null;
    this.applyFilter();
    this.showToast('Message deleted');
  }

  // ── Import transaction ────────────────────────────────────────
  // ── Category → subcategory selection ────────────────────────
  selectCategory(msg: SmsMessage, key: CategoryKey) {
    msg.importCategory = key;
    msg.importSubcategory = undefined; // reset subcategory when category changes
  }

  getSubcategories(categoryKey: CategoryKey): { name: string; limit: number }[] {
    const cat = DEFAULT_BUDGET_CATEGORIES.find(c => c.key === categoryKey);
    return cat?.subcategories ?? [];
  }

  // ── Import transaction to Firestore budget ───────────────────
  async importTransaction() {
    const msg = this.selectedMsg;
    if (!msg?.parsed || !msg.importCategory || !msg.importSubcategory) return;

    this.importing = true;
    try {
      const subcategory = msg.importSubcategory === '__skip__' ? undefined : msg.importSubcategory;

      await this.budgetService.addTransaction({
        amount: msg.parsed.amount,
        type: msg.parsed.type,
        category: msg.importCategory,
        subcategory,
        merchant: msg.parsed.merchant,
        bank: msg.parsed.bank,
        accountLast4: msg.parsed.accountLast4,
        date: msg.parsed.date,
        month: format(msg.parsed.date, 'yyyy-MM'),
        source: 'sms',
        smsRaw: msg.parsed.raw,
      });

      // Get display names for success state
      const catMeta = this.importCategories.find(c => c.key === msg.importCategory);
      const orig = this.allMessages.find(m => m.id === msg.id);
      const successData = {
        imported: true,
        importedCategory: catMeta ? `${catMeta.icon} ${catMeta.shortName}` : msg.importCategory,
        importedSubcategory: subcategory,
      };
      if (orig) Object.assign(orig, successData);
      Object.assign(msg, successData);

      this.showToast(`✓ Added to ${catMeta?.shortName ?? 'Budget'}${subcategory ? ' · ' + subcategory.split(' ').slice(1).join(' ') : ''}`, 'success');
    } catch (err: any) {
      console.error('[Import] Failed:', err?.message ?? err);
      const reason = err?.message?.includes('authenticated')
        ? 'Please sign in to save transactions.'
        : err?.message?.includes('permission')
          ? 'Permission denied. Check Firestore rules.'
          : 'Import failed. Try again.';
      this.showToast(reason, 'danger');
    } finally {
      this.importing = false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  trackById(_: number, msg: SmsMessage): string { return msg.id; }

  // Only animate first PAGE_SIZE items to avoid janky animations on scroll
  getDelay(i: number): string { return i < PAGE_SIZE ? (i * 0.025) + 's' : '0s'; }

  formatTime(date: Date): string {
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd MMM');
  }

  getAvatarBg(cat: MessageCategory): string {
    const map: Record<MessageCategory, string> = {
      personal: 'linear-gradient(135deg,#3b82f6,#2563eb)',
      transactions: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
      promotions: 'linear-gradient(135deg,#f59e0b,#d97706)',
      reminders: 'linear-gradient(135deg,#10b981,#059669)',
    };
    return map[cat];
  }

  getCatMeta(cat: MessageCategory) { return this.segments.find(s => s.key === cat)!; }

  getCatBadgeBg(cat: MessageCategory): string {
    const map: Record<MessageCategory, string> = { personal: '#dbeafe', transactions: '#ede9fe', promotions: '#fef3c7', reminders: '#d1fae5' };
    return map[cat];
  }

  getCatBadgeColor(cat: MessageCategory): string {
    const map: Record<MessageCategory, string> = { personal: '#1d4ed8', transactions: '#6d28d9', promotions: '#d97706', reminders: '#065f46' };
    return map[cat];
  }

  private async showToast(msg: string, color: 'success' | 'danger' = 'success') {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, position: 'bottom', color });
    await t.present();
  }
}