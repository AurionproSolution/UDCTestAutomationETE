/**
 * Standard Quote / Quick Quote product dropdown labels (dealer-introduced naming).
 * Used by doRegressionTestSuite helpers and specs when calling `chooseProduct` / `selectProduct`.
 */
import { DO_PORTAL_PRODUCT } from "../../../config/do-portal-products";

export const PRODUCT_AFV_B = DO_PORTAL_PRODUCT.AFV_B;
export const PRODUCT_CSA_B = DO_PORTAL_PRODUCT.CSA_B;
export const PRODUCT_CSA_C = DO_PORTAL_PRODUCT.CSA_C;
export const PRODUCT_FL_B = DO_PORTAL_PRODUCT.FL_B;
export const PRODUCT_TL_B = DO_PORTAL_PRODUCT.TL_B;
export const PRODUCT_TL_C = DO_PORTAL_PRODUCT.TL_C;

/** Common aliases in regression helpers */
export const CSA_SQ_PRODUCT = PRODUCT_CSA_C;
export const CSA_B_SQ_PRODUCT = PRODUCT_CSA_B;
export const AFV_SQ_PRODUCT = PRODUCT_AFV_B;
export const FL_SQ_PRODUCT = PRODUCT_FL_B;
export const TL_SQ_PRODUCT = PRODUCT_TL_B;
export const TL_C_SQ_PRODUCT = PRODUCT_TL_C;
