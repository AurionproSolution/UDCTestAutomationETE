Feature: ContractDetailsPageValidation

A short summary of the feature

@Sanity
Scenario Outline: Contract Details Page Validation
	Given User is on the login page
	When  User logs in with "<Username>" and "<Password>"
    Then  User should be redirected to the dashboard
	
    When User clicks on Create Quick Quote
    Then User should be redirected to the Create Quick Quote page

    When User selects "<Program>" from the Program dropdown
    And User selects "<Product>" from the Product dropdown
    And User selects "Asset" from the dropdown
    And User enters "Purchase Price"
    And User enters "Residual Value"
    And User selects Frequency from the dropdown
    And User selects Term from the dropdown
    And User clicks on Create Quote
    Then User should be redirected to the Contract Details page
    When User clicks on Add Fees and Charges
    And User enters value in Extended Service Contracts
    And User enters value in Preventative Maintenance
    And User enters value in Titling/Lien/Other (Dealer)
    And User clicks on Add Button
    And User clicks on Calculate button
    Then the Payment Summary (Installment) should match the Contract Payment Schedule section
    And the Buy Rate should be verified before contract created and after contract created
    And Edit Frequncy number of months more that 90 
    Then verify error Message for Frquancy
	Given Valid Frequncy number of months and click on calculate 
	Then Frequncy number value will be update in Edit Payment Schedule 


	Examples:
	| Username        | Password     | Program                         | Product                    |
	| sandeep.bedekar | Testing@2211 | Finance Leases Program          | Finance Lease              |
	| sandeep.bedekar | Testing@2211 | Finance Leases Program          | TRAC Lease                 |
	| sandeep.bedekar | Testing@2211 | Loan Program                    | Finance Included Loan      |
	#| sandeep.bedekar | Testing@2211 | FMV Program                     | Operating Lease            |
	| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown      | Finance Lease              |
	#| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown      | Operating Lease            |
	| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown      | TRAC Lease                 |
	| sandeep.bedekar | Testing@2211 | Credit Line Loan Takedown       | Finance Included Loan      |
    | sandeep.bedekar | Testing@2211 | IdeaLease Program               | Finance Included Loan      |
    | sandeep.bedekar | Testing@2211 | IdeaLease Program               | Idealease                  |

