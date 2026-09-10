import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { appHtml } from './appHtml';
import { appCss } from './appCss';
import { initializeRanchExpenseTracker } from './appLogic';

export interface IRanchExpenseTrackerWebPartProps {}

export default class RanchExpenseTrackerWebPart extends BaseClientSideWebPart<IRanchExpenseTrackerWebPartProps> {
  public render(): void {
    this.domElement.innerHTML = '';
    const host = document.createElement('div');
    host.className = 'ranch-expense-tracker-spfx-host';
    this.domElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>' + appCss + '</style>' + appHtml;
    initializeRanchExpenseTracker(shadow);
  }
  protected onDispose(): void { this.domElement.innerHTML = ''; }
}
