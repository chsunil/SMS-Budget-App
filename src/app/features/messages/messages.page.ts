// ─── src/app/features/messages/messages.page.ts ─
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SmsReaderService } from '../../core/services/sms-reader.service';
import { SmsParserService } from '../../core/services/sms-parser.service';
import { BudgetService } from '../../core/services/budget.service';
import { ParsedSMS, CategoryKey } from '../../core/models';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { format, isToday, isYesterday } from 'date-fns';

// ── Message model ─────────────────────────────
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
  parsed?: ParsedSMS;           // only for transactions
  importCategory?: CategoryKey; // chosen category before import
  imported?: boolean;
}

// ── Classifier keyword maps ───────────────────
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

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, InrPipe],
  template: `
    <ion-content [fullscreen]="true">
      <div class="msg-wrap">

        <!-- ── Header ── -->
        <div class="msg-header">
          <div class="header-row">
            <div>
              <h1 class="header-title">Messages</h1>
              <p class="header-sub">{{ totalUnread }} unread · {{ allMessages.length }} total</p>
            </div>
            <button class="refresh-btn" (click)="loadMessages()" [class.spinning]="loading">
              <ion-icon name="refresh-outline"></ion-icon>
            </button>
          </div>

          <!-- Search Bar -->
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
              <ion-icon name="close-circle" style="font-size:18px;color:#9ca3af"></ion-icon>
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

        <!-- ── Platform Notice ── -->
        <div class="platform-notice" *ngIf="!isAndroid && !loading && allMessages.length > 0">
          <ion-icon name="information-circle-outline"></ion-icon>
          <span>Showing demo messages — SMS reading requires Android app</span>
        </div>

        <!-- ── Loading Skeletons ── -->
        <div class="skel-list" *ngIf="loading">
          <div class="skel-item" *ngFor="let n of [1,2,3,4,5,6]">
            <div class="skeleton skel-avatar"></div>
            <div class="skel-body">
              <div class="skel-row">
                <div class="skeleton" style="height:13px;width:100px;border-radius:4px"></div>
                <div class="skeleton" style="height:11px;width:50px;border-radius:4px"></div>
              </div>
              <div class="skeleton" style="height:11px;width:200px;border-radius:4px;margin-top:6px"></div>
              <div class="skeleton" style="height:11px;width:150px;border-radius:4px;margin-top:4px"></div>
            </div>
          </div>
        </div>

        <!-- ── Empty State ── -->
        <div class="empty-state" *ngIf="!loading && filteredMessages.length === 0">
          <div class="empty-emoji">{{ activeSegmentMeta.emptyIcon }}</div>
          <h3>{{ searchQuery ? 'No results found' : 'No ' + activeSegmentMeta.label + ' messages' }}</h3>
          <p>{{ searchQuery ? 'Try a different search term' : activeSegmentMeta.emptyText }}</p>
          <button class="empty-load-btn" *ngIf="!searchQuery && allMessages.length === 0" (click)="loadMessages()">
            <ion-icon name="refresh-outline"></ion-icon>
            Load Messages
          </button>
        </div>

        <!-- ── Message List ── -->
        <div class="msg-list" *ngIf="!loading && filteredMessages.length > 0">

          <!-- Mark all read button -->
          <div class="list-actions" *ngIf="getUnread(activeSegment) > 0">
            <button class="mark-all-btn" (click)="markAllRead()">
              <ion-icon name="checkmark-done-outline"></ion-icon>
              Mark all read
            </button>
          </div>

          <div class="msg-item-wrap" *ngFor="let msg of filteredMessages; let i = index"
            [style.animation-delay]="(i * 0.04) + 's'">

            <!-- Swipe container -->
            <ion-item-sliding #slidingItem>

              <!-- Swipe LEFT → Archive -->
              <ion-item-options side="start">
                <ion-item-option color="medium" (click)="archiveMessage(msg, slidingItem)">
                  <ion-icon slot="icon-only" name="archive-outline"></ion-icon>
                </ion-item-option>
              </ion-item-options>

              <!-- Message Card -->
              <ion-item lines="none" class="msg-item-ion">
                <div class="msg-card" [class.unread]="!msg.isRead" (click)="openMessage(msg)">

                  <!-- Avatar -->
                  <div class="msg-avatar" [style.background]="getAvatarBg(msg.category)">
                    <span class="avatar-letter">{{ msg.senderDisplay[0].toUpperCase() }}</span>
                    <div class="unread-dot" *ngIf="!msg.isRead"></div>
                  </div>

                  <!-- Body -->
                  <div class="msg-body">
                    <div class="msg-top-row">
                      <span class="msg-sender" [class.bold]="!msg.isRead">{{ msg.senderDisplay }}</span>
                      <span class="msg-time">{{ formatTime(msg.date) }}</span>
                    </div>
                    <div class="msg-preview" [class.bold-preview]="!msg.isRead">
                      {{ msg.body | slice:0:80 }}{{ msg.body.length > 80 ? '…' : '' }}
                    </div>
                    <!-- Transaction pill -->
                    <div class="txn-pill" *ngIf="msg.category === 'transactions' && msg.parsed">
                      <span class="pill-amount" [class.debit]="msg.parsed.type === 'debit'" [class.credit]="msg.parsed.type === 'credit'">
                        {{ msg.parsed.type === 'debit' ? '−' : '+' }}{{ msg.parsed.amount | inr }}
                      </span>
                      <span class="pill-bank">{{ msg.parsed.bank }}</span>
                      <span class="pill-conf" [class]="'conf-' + msg.parsed.confidence">
                        {{ msg.parsed.confidence }}
                      </span>
                      <span class="pill-imported" *ngIf="msg.imported">✓ imported</span>
                    </div>
                  </div>
                </div>
              </ion-item>

              <!-- Swipe RIGHT → Delete -->
              <ion-item-options side="end">
                <ion-item-option color="danger" (click)="deleteMessage(msg, slidingItem)">
                  <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                </ion-item-option>
              </ion-item-options>

            </ion-item-sliding>
          </div>
        </div>

        <div style="height:100px"></div>
      </div>

      <!-- ── Message Detail Sheet ── -->
      <div class="detail-overlay" [class.open]="!!selectedMsg" (click)="closeDetail()">
        <div class="detail-sheet" (click)="$event.stopPropagation()" *ngIf="selectedMsg">
          <div class="sheet-handle"></div>

          <!-- Header -->
          <div class="detail-header">
            <div class="detail-avatar" [style.background]="getAvatarBg(selectedMsg.category)">
              {{ selectedMsg.senderDisplay[0].toUpperCase() }}
            </div>
            <div class="detail-sender-info">
              <div class="detail-sender">{{ selectedMsg.senderDisplay }}</div>
              <div class="detail-date">{{ selectedMsg.date | date:'EEEE, dd MMM yyyy · h:mm a' }}</div>
            </div>
            <div class="detail-cat-badge" [style.background]="getCatBadgeBg(selectedMsg.category)" [style.color]="getCatBadgeColor(selectedMsg.category)">
              {{ getCatMeta(selectedMsg.category).icon }} {{ getCatMeta(selectedMsg.category).label }}
            </div>
          </div>

          <!-- Full message body -->
          <div class="detail-body">{{ selectedMsg.body }}</div>

          <!-- ── Transaction Import Panel ── -->
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

              <!-- Already imported -->
              <div class="already-imported" *ngIf="selectedMsg.imported">
                <ion-icon name="checkmark-circle"></ion-icon>
                Already added to budget
              </div>

              <!-- Import controls -->
              <ng-container *ngIf="!selectedMsg.imported">
                <div class="import-label">Add to budget category</div>
                <div class="cat-grid">
                  <button class="cat-chip-btn"
                    *ngFor="let cat of importCategories"
                    [class.active]="selectedMsg.importCategory === cat.key"
                    (click)="selectedMsg.importCategory = cat.key"
                    [style.border-color]="selectedMsg.importCategory === cat.key ? cat.color : 'transparent'"
                    [style.background]="selectedMsg.importCategory === cat.key ? cat.color + '18' : '#f9fafb'">
                    <span class="cat-chip-icon">{{ cat.icon }}</span>
                    <span class="cat-chip-name" [style.color]="selectedMsg.importCategory === cat.key ? cat.color : '#6b7280'">
                      {{ cat.shortName }}
                    </span>
                  </button>
                </div>

                <button class="import-btn" (click)="importTransaction()" [disabled]="importing">
                  <ion-spinner *ngIf="importing" name="crescent" style="width:16px;height:16px;--color:white"></ion-spinner>
                  <ion-icon *ngIf="!importing" name="add-circle-outline"></ion-icon>
                  <span *ngIf="!importing">Add to Budget</span>
                </button>
              </ng-container>
            </div>
          </ng-container>

          <!-- Actions row -->
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

    /* ── Header ── */
    .msg-wrap { background: #f3f4f6; min-height: 100vh; }

    .msg-header {
      background: linear-gradient(160deg, #7c3aed 0%, #5b21b6 100%);
      padding: 52px 16px 0;
      border-radius: 0 0 28px 28px;
      margin-bottom: 8px;
    }
    .header-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 14px;
    }
    .header-title {
      font-family: 'Inter', sans-serif;
      font-size: 26px; font-weight: 800;
      color: white; margin-bottom: 2px;
    }
    .header-sub { font-size: 12px; color: rgba(255,255,255,0.65); }
    .refresh-btn {
      width: 38px; height: 38px; border-radius: 50%; border: none;
      background: rgba(255,255,255,0.15); color: white; font-size: 18px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; backdrop-filter: blur(6px);
      transition: transform 0.4s;
      &.spinning { animation: spin 0.8s linear infinite; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Search */
    .search-wrap {
      display: flex; align-items: center;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border: 1.5px solid rgba(255,255,255,0.2);
      border-radius: 14px; padding: 0 14px;
      margin-bottom: 16px;
      transition: background 0.2s, border-color 0.2s;
      &.focused {
        background: rgba(255,255,255,0.25);
        border-color: rgba(255,255,255,0.5);
      }
    }
    .search-icon { color: rgba(255,255,255,0.7); font-size: 17px; flex-shrink: 0; }
    .search-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: white; font-family: 'Inter', sans-serif; font-size: 14px;
      padding: 11px 10px;
      &::placeholder { color: rgba(255,255,255,0.5); }
    }
    .search-clear { background: transparent; border: none; cursor: pointer; display: flex; align-items: center; }

    /* Segments */
    .segments-row {
      display: flex; gap: 4px;
      padding-bottom: 0;
      overflow-x: auto;
      &::-webkit-scrollbar { display: none; }
    }
    .seg-btn {
      flex: 1; min-width: 72px;
      display: flex; flex-direction: column; align-items: center;
      gap: 4px; padding: 10px 8px 0;
      border: none; background: transparent; cursor: pointer;
      position: relative;
      border-bottom: 3px solid transparent;
      transition: border-color 0.2s;
    }
    .seg-icon { font-size: 18px; }
    .seg-label {
      font-family: 'Inter', sans-serif;
      font-size: 11px; font-weight: 600;
      color: rgba(255,255,255,0.6);
      white-space: nowrap;
    }
    .seg-badge {
      position: absolute; top: 4px; right: 8px;
      background: #ef4444; color: white;
      font-size: 9px; font-weight: 800;
      padding: 1px 5px; border-radius: 20px;
      min-width: 16px; text-align: center;
    }
    .seg-btn.active {
      border-bottom-color: white;
      .seg-label { color: white; font-weight: 800; }
    }

    /* Platform Notice */
    .platform-notice {
      display: flex; align-items: center; gap: 8px;
      margin: 8px 16px;
      background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2);
      border-radius: 12px; padding: 10px 14px;
      font-size: 12px; color: #3b82f6;
      ion-icon { font-size: 16px; flex-shrink: 0; }
    }

    /* Skeleton */
    .skel-list { padding: 8px 16px; }
    .skel-item { display: flex; gap: 12px; padding: 14px 16px; background: white; border-radius: 16px; margin-bottom: 8px; }
    .skel-avatar { width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0; }
    .skel-body { flex: 1; }
    .skel-row { display: flex; justify-content: space-between; }
    .skeleton {
      background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

    /* Empty */
    .empty-state { text-align: center; padding: 60px 24px;
      .empty-emoji { font-size: 52px; margin-bottom: 16px; display: block; }
      h3 { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: #374151; margin-bottom: 8px; }
      p { font-size: 13px; color: #9ca3af; margin-bottom: 24px; line-height: 1.5; }
    }
    .empty-load-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white; border: none; border-radius: 14px;
      padding: 13px 24px;
      font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700;
      cursor: pointer; box-shadow: 0 8px 24px rgba(109,40,217,0.3);
    }

    /* List Actions */
    .list-actions { display: flex; justify-content: flex-end; padding: 4px 16px 8px; }
    .mark-all-btn {
      display: flex; align-items: center; gap: 5px;
      background: transparent; border: none;
      font-size: 12px; font-weight: 600; color: #7c3aed; cursor: pointer;
      ion-icon { font-size: 15px; }
    }

    /* Message Items */
    .msg-list { padding: 0 16px; }
    .msg-item-wrap {
      animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both;
      margin-bottom: 8px;
    }
    @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

    ion-item-sliding { border-radius: 16px; overflow: hidden; }
    ion-item-option { font-size: 22px; }
    .msg-item-ion { --padding-start: 0; --inner-padding-end: 0; --background: transparent; }

    .msg-card {
      display: flex; align-items: flex-start; gap: 12px;
      background: white; border-radius: 16px; padding: 14px;
      width: 100%; cursor: pointer;
      box-shadow: 0 1px 6px rgba(0,0,0,0.05);
      transition: transform 0.15s;
      &:active { transform: scale(0.98); }
      &.unread { background: white; border-left: 3px solid #7c3aed; }
    }

    .msg-avatar {
      width: 46px; height: 46px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; position: relative;
    }
    .avatar-letter { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: white; }
    .unread-dot {
      position: absolute; top: -2px; right: -2px;
      width: 10px; height: 10px; border-radius: 50%;
      background: #7c3aed; border: 2px solid white;
    }

    .msg-body { flex: 1; min-width: 0; }
    .msg-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
    .msg-sender { font-size: 13px; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
    .msg-sender.bold { font-weight: 700; color: #111827; }
    .msg-time { font-size: 11px; color: #9ca3af; flex-shrink: 0; }
    .msg-preview { font-size: 12px; color: #9ca3af; line-height: 1.4; }
    .msg-preview.bold-preview { color: #374151; }

    /* Transaction pill */
    .txn-pill {
      display: flex; align-items: center; gap: 6px;
      margin-top: 6px; flex-wrap: wrap;
    }
    .pill-amount {
      font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 800;
      &.debit { color: #ef4444; }
      &.credit { color: #10b981; }
    }
    .pill-bank {
      background: #f3f4f6; color: #6b7280;
      padding: 1px 7px; border-radius: 20px; font-size: 10px; font-weight: 600;
    }
    .pill-conf {
      padding: 1px 7px; border-radius: 20px; font-size: 10px; font-weight: 700;
      &.conf-high { background: #d1fae5; color: #065f46; }
      &.conf-medium { background: #fef3c7; color: #92400e; }
      &.conf-low { background: #fee2e2; color: #991b1b; }
    }
    .pill-imported {
      background: #ede9fe; color: #7c3aed;
      padding: 1px 8px; border-radius: 20px; font-size: 10px; font-weight: 700;
    }

    /* ── Detail Sheet ── */
    .detail-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0);
      z-index: 200; pointer-events: none;
      display: flex; align-items: flex-end;
      transition: background 0.3s;
      &.open { background: rgba(0,0,0,0.45); pointer-events: all; }
    }
    .detail-sheet {
      width: 100%; max-width: 480px; margin: 0 auto;
      background: white; border-radius: 28px 28px 0 0;
      padding: 16px 20px 40px;
      transform: translateY(100%);
      transition: transform 0.38s cubic-bezier(0.16,1,0.3,1);
      max-height: 92vh; overflow-y: auto;
    }
    .detail-overlay.open .detail-sheet { transform: translateY(0); }
    .sheet-handle { width: 40px; height: 4px; border-radius: 2px; background: #e5e7eb; margin: 0 auto 18px; }

    .detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .detail-avatar {
      width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: white;
    }
    .detail-sender-info { flex: 1; }
    .detail-sender { font-size: 15px; font-weight: 700; color: #111827; }
    .detail-date { font-size: 11px; color: #9ca3af; margin-top: 2px; }
    .detail-cat-badge {
      padding: 4px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }

    .detail-body {
      background: #f9fafb; border-radius: 14px; padding: 14px;
      font-size: 13px; color: #374151; line-height: 1.6;
      margin-bottom: 16px; border: 1px solid #f3f4f6;
    }

    /* Transaction Detail Card */
    .txn-detail-card {
      background: #f9fafb; border-radius: 16px; padding: 16px;
      margin-bottom: 16px; border: 1px solid #f3f4f6;
    }
    .txn-detail-title {
      font-size: 11px; font-weight: 700; color: #9ca3af;
      text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;
    }
    .txn-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .td-item { }
    .td-label { font-size: 11px; color: #9ca3af; margin-bottom: 3px; }
    .td-val { font-size: 14px; font-weight: 600; color: #111827; }
    .type-badge {
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
      &.debit { background: #fee2e2; color: #ef4444; }
      &.credit { background: #d1fae5; color: #10b981; }
    }
    .conf-badge {
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
      &.conf-high { background: #d1fae5; color: #065f46; }
      &.conf-medium { background: #fef3c7; color: #92400e; }
      &.conf-low { background: #fee2e2; color: #991b1b; }
    }

    .already-imported {
      display: flex; align-items: center; gap: 7px;
      background: #d1fae5; color: #065f46; border-radius: 12px;
      padding: 10px 14px; font-size: 13px; font-weight: 600;
      ion-icon { font-size: 18px; }
    }

    .import-label {
      font-size: 11px; font-weight: 700; color: #9ca3af;
      text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;
    }
    .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .cat-chip-btn {
      border: 2px solid transparent; border-radius: 12px; padding: 8px 4px;
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      cursor: pointer; transition: all 0.18s; background: #f9fafb;
    }
    .cat-chip-icon { font-size: 18px; }
    .cat-chip-name { font-size: 9px; font-weight: 700; text-align: center; }

    .import-btn {
      width: 100%; padding: 14px; border-radius: 14px; border: none;
      background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white;
      font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      cursor: pointer; box-shadow: 0 6px 20px rgba(109,40,217,0.3);
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    /* Detail Actions */
    .detail-actions { display: flex; gap: 8px; margin-top: 4px; }
    .da-btn {
      flex: 1; padding: 12px 8px; border-radius: 14px; border: 1.5px solid #e5e7eb;
      background: white; cursor: pointer;
      font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      transition: all 0.15s;
      ion-icon { font-size: 18px; }
      &:active { transform: scale(0.96); }
    }
    .da-read { color: #7c3aed; ion-icon { color: #7c3aed; } }
    .da-archive { color: #6b7280; ion-icon { color: #6b7280; } }
    .da-delete { color: #ef4444; border-color: #fee2e2; background: #fff5f5; ion-icon { color: #ef4444; } }
  `]
})
export class MessagesPage implements OnInit {
  allMessages: SmsMessage[] = [];
  filteredMessages: SmsMessage[] = [];
  activeSegment: MessageCategory = 'transactions';
  searchQuery = '';
  searchFocused = false;
  loading = false;
  selectedMsg: SmsMessage | null = null;
  importing = false;

  readonly segments = [
    { key: 'personal' as MessageCategory,     icon: '👤', label: 'Personal',     emptyIcon: '👤', emptyText: 'No personal messages found' },
    { key: 'transactions' as MessageCategory, icon: '💳', label: 'Transactions',  emptyIcon: '💳', emptyText: 'No transaction messages found' },
    { key: 'promotions' as MessageCategory,   icon: '🏷️', label: 'Promotions',   emptyIcon: '🏷️', emptyText: 'No promotional messages' },
    { key: 'reminders' as MessageCategory,    icon: '🔔', label: 'Reminders',    emptyIcon: '🔔', emptyText: 'No reminders found' },
  ];

  readonly importCategories = [
    { key: 'fixed_costs' as CategoryKey,     icon: '🏦', shortName: 'Fixed',   color: '#f5c842' },
    { key: 'food_household' as CategoryKey,  icon: '🛒', shortName: 'Food',    color: '#60a5fa' },
    { key: 'savings' as CategoryKey,         icon: '💰', shortName: 'Savings', color: '#10b981' },
    { key: 'self_investment' as CategoryKey, icon: '🌿', shortName: 'Growth',  color: '#a78bfa' },
    { key: 'fun_family' as CategoryKey,      icon: '🎉', shortName: 'Fun',     color: '#fb923c' },
    { key: 'giving_misc' as CategoryKey,     icon: '💖', shortName: 'Giving',  color: '#f472b6' },
    { key: 'uncategorized' as CategoryKey,   icon: '❓', shortName: 'Other',   color: '#9ca3af' },
  ];

  constructor(
    private smsReader: SmsReaderService,
    private smsParser: SmsParserService,
    private budgetService: BudgetService,
    private toastCtrl: ToastController
  ) {}

  get isAndroid(): boolean { return this.smsReader.isPlatformAndroid; }

  get totalUnread(): number { return this.allMessages.filter(m => !m.isRead && !m.isArchived).length; }

  get activeSegmentMeta() { return this.segments.find(s => s.key === this.activeSegment)!; }

  ngOnInit() { this.loadMessages(); }

  // ── Load & Classify ───────────────────────────
  async loadMessages() {
    this.loading = true;
    try {
      const raw = await this.smsReader.readAllSMS();
      this.allMessages = raw
        .map((sms, i) => this.buildMessage(sms, i))
        .filter(m => !m.isArchived);
      this.applyFilter();
    } finally {
      this.loading = false;
    }
  }

  private buildMessage(raw: { body: string; address: string; date: number }, i: number): SmsMessage {
    const category = this.classify(raw.body, raw.address);
    const parsed = category === 'transactions'
      ? this.smsParser.parseSMS(raw.body, raw.address)
      : undefined;

    // Auto-set import category for transactions
    const importCategory = parsed ? this.smsParser.autoCategory(parsed) : undefined;

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
      importCategory,
    };
  }

  private classify(body: string, sender: string): MessageCategory {
    // Check transactions first (most specific)
    const matchCount = TRANSACTION_PATTERNS.filter(p => p.test(body)).length;
    if (matchCount >= 2) return 'transactions';

    // Check reminders
    if (REMINDER_PATTERNS.some(p => p.test(body))) return 'reminders';

    // Check promotions
    if (PROMO_PATTERNS.some(p => p.test(body))) return 'promotions';

    // Sender-based: numeric sender = likely automated
    if (/^\d+$/.test(sender)) return 'promotions';

    // Everything else = personal
    return 'personal';
  }

  private formatSender(raw: string): string {
    if (!raw) return 'Unknown';
    // Already readable like "SBIINB" → "SBI"
    if (/^[A-Z]{2}-/.test(raw)) return raw.split('-')[1];
    if (raw.length <= 8 && /[A-Z]/.test(raw)) return raw;
    // Long number → mask it
    if (raw.length >= 10) return raw.replace(/(\d{2})\d+(\d{4})/, '$1••••$2');
    return raw;
  }

  // ── Filter & Search ───────────────────────────
  setSegment(seg: MessageCategory) {
    this.activeSegment = seg;
    this.applyFilter();
  }

  onSearch() { this.applyFilter(); }
  clearSearch() { this.searchQuery = ''; this.applyFilter(); }

  applyFilter() {
    let msgs = this.allMessages
      .filter(m => m.category === this.activeSegment && !m.isArchived);

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      msgs = msgs.filter(m =>
        m.senderDisplay.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q)
      );
    }

    // Sort: unread first, then by date desc
    this.filteredMessages = msgs.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return b.date.getTime() - a.date.getTime();
    });
  }

  getUnread(seg: MessageCategory): number {
    return this.allMessages.filter(m => m.category === seg && !m.isRead && !m.isArchived).length;
  }

  // ── Message Actions ───────────────────────────
  openMessage(msg: SmsMessage) {
    msg.isRead = true;
    this.selectedMsg = { ...msg };
    // Set default import category if missing
    if (this.selectedMsg.category === 'transactions' && this.selectedMsg.parsed && !this.selectedMsg.importCategory) {
      this.selectedMsg.importCategory = this.smsParser.autoCategory(this.selectedMsg.parsed);
    }
  }

  closeDetail() {
    // Sync isRead back
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
    this.allMessages
      .filter(m => m.category === this.activeSegment)
      .forEach(m => m.isRead = true);
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

  // ── Import Transaction ────────────────────────
  async importTransaction() {
    if (!this.selectedMsg?.parsed || !this.selectedMsg.importCategory) return;
    this.importing = true;
    try {
      await this.budgetService.addTransaction({
        amount: this.selectedMsg.parsed.amount,
        type: this.selectedMsg.parsed.type,
        category: this.selectedMsg.importCategory,
        merchant: this.selectedMsg.parsed.merchant,
        bank: this.selectedMsg.parsed.bank,
        accountLast4: this.selectedMsg.parsed.accountLast4,
        date: this.selectedMsg.parsed.date,
        month: format(this.selectedMsg.parsed.date, 'yyyy-MM'),
        source: 'sms',
        smsRaw: this.selectedMsg.parsed.raw,
      });
      // Mark as imported
      const orig = this.allMessages.find(m => m.id === this.selectedMsg!.id);
      if (orig) orig.imported = true;
      this.selectedMsg.imported = true;
      this.showToast('Added to budget ✓', 'success');
    } catch {
      this.showToast('Import failed. Try again.', 'danger');
    } finally {
      this.importing = false;
    }
  }

  // ── Helpers ───────────────────────────────────
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

  getCatMeta(cat: MessageCategory) {
    return this.segments.find(s => s.key === cat)!;
  }

  getCatBadgeBg(cat: MessageCategory): string {
    const map: Record<MessageCategory, string> = {
      personal: '#dbeafe', transactions: '#ede9fe',
      promotions: '#fef3c7', reminders: '#d1fae5',
    };
    return map[cat];
  }

  getCatBadgeColor(cat: MessageCategory): string {
    const map: Record<MessageCategory, string> = {
      personal: '#1d4ed8', transactions: '#6d28d9',
      promotions: '#d97706', reminders: '#065f46',
    };
    return map[cat];
  }

  private async showToast(msg: string, color: 'success' | 'danger' = 'success') {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, position: 'bottom', color });
    await t.present();
  }
}

import { format, isToday, isYesterday } from 'date-fns';