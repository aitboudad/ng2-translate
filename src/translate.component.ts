import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Sanitizer,
  SecurityContext,
  SimpleChange
} from '@angular/core';
import {
  LangChangeEvent,
  TranslateService,
  TranslationChangeEvent
} from './translate.service';
import { ɵDomAdapter as DomAdapter, ɵgetDOM as getDOM } from '@angular/platform-browser';

@Directive({
  selector: '[translate]'
})
export class TranslateDirective implements OnInit, OnChanges, OnDestroy {
  @Input('translate') translateKey: string;
  @Input() translateInterpolation: string;
  @Input() translateParams: { [key: string]: string } = {};

  private dom: DomAdapter = getDOM();
  private key: string;
  onTranslationChange: EventEmitter<TranslationChangeEvent>;
  onLangChange: EventEmitter<LangChangeEvent>;

  constructor(
    public sanitizer: Sanitizer,
    public translate: TranslateService,
    public _elRef: ElementRef,
    public _cdRef: ChangeDetectorRef
  ) {}

  /**
   * preserves the key from the translate attribute or from innerHTML
   */
  ngOnInit() {
    this.key = this.translateKey ? this.translateKey : this.dom.getInnerHTML(this._elRef.nativeElement);
    this.updateValue();

    // if there is a subscription to onLangChange, clean it
    this._dispose();

    // subscribe to onTranslationChange event, in case the translations change
    if (!this.onTranslationChange) {
      this.onTranslationChange = this.translate.onTranslationChange.subscribe((event: TranslationChangeEvent) => {
        if (event.lang === this.translate.currentLang) {
          this.updateValue();
        }
      });
    }

    // subscribe to onLangChange event, in case the language changes
    if (!this.onLangChange) {
      this.onLangChange = this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
        this.updateValue();
      });
    }
  }

  /**
   * updates the translation if the interpolation params change
   * @param  changes
   */
  ngOnChanges(changes: { [key: string]: SimpleChange; }) {
      if (changes["translateKey"]) {
        this.key = this.translateKey;
      }

      if ((changes["translateParams"] || changes["translateKey"]) && this.key) {
        this.updateValue();
      }
  }

  /**
   * updates the translation
   * @param  key
   */
  updateValue() {
    if (!this.key || this.key === '') {
      return;
    }

    Object.keys(this.translateParams).forEach(valueKey => {
      this.translateParams[valueKey] = this.sanitizer.sanitize(SecurityContext.HTML, this.translateParams[valueKey]);
    });

    if (this.translateInterpolation) {
        this.translateParams['parser'] = this.translateInterpolation;
    }

    this.translate.get(this.key.toString().replace(/^\s+|\s+$/g, ''), this.translateParams).subscribe((res: string | any) => {
      this.dom.setInnerHTML(this._elRef.nativeElement, res ? this.sanitizer.sanitize(SecurityContext.HTML, res) : this.key);
      this._cdRef.markForCheck();
    });
  }

  /**
   * Clean any existing subscription to change events
   * @private
   */
  _dispose(): void {
    if (typeof this.onTranslationChange !== 'undefined') {
      this.onTranslationChange.unsubscribe();
      this.onTranslationChange = undefined;
    }
    if (typeof this.onLangChange !== 'undefined') {
      this.onLangChange.unsubscribe();
      this.onLangChange = undefined;
    }
  }

  ngOnDestroy(): void {
    this._dispose();
  }
}
