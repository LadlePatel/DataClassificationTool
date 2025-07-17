"use server";

/**
 * @fileOverview An AI flow for classifying bank data columns.
 * - classifyColumn - A function that handles the column classification process.
 * - ClassifyColumnOutput - The return type for the classifyColumn function.
 */

import { ai } from "@/ai/genkit";
import { ndmoClassificationOptions } from "@/lib/types";
import { z } from "zod";

const ClassifyColumnOutputSchema = z.object({
  description: z
    .string()
    .describe(
      "A very literal, one-line explanation of the column's contents, derived *only* from the column name."
    ),
  ndmoClassification: z
    .enum(ndmoClassificationOptions)
    .describe("The NDMO classification based on data sensitivity."),
  reason_ndmo: z
    .string()
    .describe("The NDMO reason based on the ndmoClassification."),
  pii: z.boolean().describe("Is this Personally Identifiable Information?"),
  phi: z.boolean().describe("Is this Personal Health Information?"),
  pfi: z.boolean().describe("Is this Payment Financial Information?"),
  psi: z.boolean().describe("Is this Payment System Information?"),
  pci: z
    .boolean()
    .describe(
      "Does this fall under PCI DSS (Payment Card Industry Data Security Standard)?"
    ),
});

export type ClassifyColumnOutput = z.infer<typeof ClassifyColumnOutputSchema>;

export async function classifyColumn(
  columnName: string
): Promise<ClassifyColumnOutput> {
  return classifyColumnFlow(columnName);
}

const classifyColumnFlow = ai.defineFlow(
  {
    name: "classifyColumnFlow",
    inputSchema: z.string(),
    outputSchema: ClassifyColumnOutputSchema,
  },
  async (columnName) => {
    const prompt = `You are a highly accurate data governance classification engine trained on ANB Bank's enterprise-wide data inventory and classification policy.

Your job is to classify database column names into appropriate sensitivity categories, based on ANB's domains.

ANB BANK DATA DOMAINS & COLUMN EXAMPLES:

**Customer Domain:**
- Retail Banking: customer_id, cif_id, phone_num, email, kyc_status, risk_score, customer_name, address_line1, nationality_code, birth_date
- Private Banking: hni_segment_code, relationship_manager_email, private_customer_details, wealth_category
- Corporate Banking: corporate_client_id, company_name, business_type, sama_category, edd_info
- Remittance: remittance_customer_id, sender_details, beneficiary_info

**Product Domain:**
- Retail Accounts: acid, foracid, virtual_acct, account_balance, dormant_status, minimum_balance, service_charges
- Retail Deposits: deposit_id, fixed_deposit_amt, deposit_tenure, interest_rate, maturity_date
- Retail Cards: card_number, card_type, expiry_date, card_limit, spending_pattern, reward_points
- Private Banking: premium_card_details, deposit_interest_rates, investment_products

**Transactions Domain:**
- Retail Transactions: tran_id, tran_amt, transaction_timestamp, transaction_location, transfer_acct
- Wholesale Transactions: high_value_tran_id, payment_method, ips_reference, sarie_ref, swift_code
- Private Banking: private_tran_volume, transaction_frequency, channel_used
- Treasury: fx_spot_rate, fx_forward_rate, derivative_position, banknote_transaction

**Risk Domain:**
- Market Risk: irrbp, liquidity_ratio, interest_rate_derivatives, trading_book_position, collateral_value
- Credit Risk: npl_ratio, coverage_ratio, risk_score, ifrs9_provision, concentration_risk
- Retail Credit Risk: personal_loan_risk, credit_card_risk, home_loan_indicator
- Operational Risk: operational_event_id, risk_assessment_score, control_effectiveness

**Finance Domain:**
- General Ledger: gl_code, posting_date, debit_amount, credit_amount, journal_entry_id
- Fixed Assets: asset_id, depreciation_rate, asset_category, lease_flag
- Budget: budget_line_item, allocated_amount, actual_spending, variance_pct

**Compliance Domain:**
- AML: customer_nationality, transaction_pattern, watchlist_match, suspicious_activity_flag
- Regulatory: sama_report_id, compliance_status, regulatory_breach_flag

**Human Resource Domain:**
- Compensation: emp_id, salary, bonus, benefits, native_lang_name, contact_num
- Performance: performance_rating, training_completion, promotion_eligibility

**Customer Care Domain:**
- Complaints: complaint_id, complaint_type, resolution_status, escalation_level
- Service: service_request_id, channel_used, response_time

**Legal Domain:**
- Case: case_id, litigation_status, court_schedule, legal_counsel_assigned
- Contracts: contract_id, contract_type, expiry_date, renewal_terms

**Nominee Info Domain:**
- Nominee: nom_name, nom_unique_id, nom_guard_name, nom_addr1, relationship_type

**Instructional Domain:**
- Instruction: instruction_id, account_mgr_id, acct_poa_as_name, instruction_type

CLASSIFICATION GUIDELINES:
- PII: Names, addresses, phone numbers, emails, national IDs, birth dates
- PHI: Health information (rare in banking)
- PFI: Account balances, transaction amounts, salary, financial metrics
- PSI: Payment system codes, routing info, transaction processing data
- PCI: Card numbers, expiry dates, CVV, cardholder data

Your task: Classify the following column name: \`${columnName}\`

You must respond with ONLY a valid JSON object (no markdown backticks, no explanation):
{
  "description": "Brief literal description of what this column contains",
  "ndmoClassification": "one of: ${ndmoClassificationOptions.join(", ")}",
  "reason_ndmo": "give the reason based on the ndmoClassification why this ndmoClassification is selected in just under 5 words",
  "pii": boolean,
  "phi": boolean,
  "pfi": boolean,
  "psi": boolean,
  "pci": boolean
}`;

    const { output } = await ai.generate({
      model: "openai/gpt-4o",
      output: { schema: ClassifyColumnOutputSchema },
      prompt,
      config: {
        response_format: { type: "json_object" },
      },
    });

    if (!output) {
      throw new Error(
        "AI failed to generate a classification. The model returned a null response."
      );
    }

    return output;
  }
);
