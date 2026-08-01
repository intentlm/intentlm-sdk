import { INTENT_TAXONOMY, TOKEN_BY_LABEL, isValidTokenId } from '../src/taxonomy.js';

describe('INTENT_TAXONOMY', () => {
  it('has token 102 as PRICING_VIEW', () => {
    expect(INTENT_TAXONOMY[102]).toBe('PRICING_VIEW');
  });

  it('has token 910 as SESSION_STARTED', () => {
    expect(INTENT_TAXONOMY[910]).toBe('SESSION_STARTED');
  });

  it('includes e-commerce funnel tokens in purchase namespace', () => {
    expect(INTENT_TAXONOMY[211]).toBe('ADD_TO_CART');
    expect(INTENT_TAXONOMY[214]).toBe('COUPON_APPLIED');
  });

  it('includes renewal and support outcome tokens in correct namespaces', () => {
    expect(INTENT_TAXONOMY[512]).toBe('SUBSCRIPTION_RENEWED');
    expect(INTENT_TAXONOMY[709]).toBe('TICKET_RESOLVED');
    expect(INTENT_TAXONOMY[310]).toBe('FORM_SUBMIT_SUCCESS');
    expect(INTENT_TAXONOMY[911]).toBe('SCROLL_DEPTH_50');
  });

  it('includes auth funnel tokens in navigation and security namespaces', () => {
    expect(INTENT_TAXONOMY[110]).toBe('LOGIN_VIEW');
    expect(INTENT_TAXONOMY[111]).toBe('SIGNUP_VIEW');
    expect(INTENT_TAXONOMY[112]).toBe('PASSWORD_RESET_VIEW');
    expect(INTENT_TAXONOMY[1007]).toBe('SIGNUP_COMPLETED');
    expect(INTENT_TAXONOMY[1008]).toBe('LOGOUT');
  });

  it('includes B2C commerce and marketplace demand tokens', () => {
    expect(INTENT_TAXONOMY[113]).toBe('CATEGORY_PAGE_VIEW');
    expect(INTENT_TAXONOMY[215]).toBe('WISHLIST_VIEW');
    expect(INTENT_TAXONOMY[216]).toBe('WISHLIST_TO_CART');
    expect(INTENT_TAXONOMY[217]).toBe('GUEST_CHECKOUT_STARTED');
    expect(INTENT_TAXONOMY[219]).toBe('CART_ITEM_REMOVED');
    expect(INTENT_TAXONOMY[1535]).toBe('PROVIDER_PROFILE_VIEW');
    expect(INTENT_TAXONOMY[1536]).toBe('BOOKING_STARTED');
    expect(INTENT_TAXONOMY[1537]).toBe('BOOKING_CONFIRMED');
    expect(INTENT_TAXONOMY[1539]).toBe('WAITLIST_JOINED');
  });

  it('includes adversarial agent bridge tokens in security namespace', () => {
    expect(INTENT_TAXONOMY[1459]).toBe('AGENT_INJECTION_DETECTED');
    expect(INTENT_TAXONOMY[1454]).toBe('REFUND_POLICY_PAGE_VIEW');
    expect(isValidTokenId(1463)).toBe(true);
  });
});

describe('TOKEN_BY_LABEL', () => {
  it('reverse-maps PRICING_VIEW to 102', () => {
    expect(TOKEN_BY_LABEL['PRICING_VIEW']).toBe(102);
  });

  it('reverse-maps SESSION_STARTED to 910', () => {
    expect(TOKEN_BY_LABEL['SESSION_STARTED']).toBe(910);
  });

  it('round-trips all tokens', () => {
    for (const [idStr, label] of Object.entries(INTENT_TAXONOMY)) {
      const id = parseInt(idStr);
      expect(TOKEN_BY_LABEL[label as keyof typeof TOKEN_BY_LABEL]).toBe(id);
    }
  });
});

describe('isValidTokenId', () => {
  it('returns true for valid token 102', () => {
    expect(isValidTokenId(102)).toBe(true);
  });

  it('returns false for unknown token 999999', () => {
    expect(isValidTokenId(999999)).toBe(false);
  });

  it('returns false for token 0 (padding token)', () => {
    expect(isValidTokenId(0)).toBe(false);
  });
});
