Feature: ContractDetailsPageValidation

A short summary of the feature

@Sanity
Scenario Outline: Contract Details Page Validation
	#Given User is on the login page
	#When  User logs in with "<Username>" and "<Password>"
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
	| sandeep.bedekar | Testing@2211 | FMV Program                     | Operating Lease            |
	| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown      | Finance Lease              |
	#| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown      | Operating Lease            |
	| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown      | TRAC Lease                 |
	| sandeep.bedekar | Testing@2211 | Credit Line Loan Takedown       | Finance Included Loan      |
    | sandeep.bedekar | Testing@2211 | IdeaLease Program               | Finance Included Loan      |
    | sandeep.bedekar | Testing@2211 | IdeaLease Program               | Idealease                  |



	@Sanity
Scenario Outline: VIN Number Asset Validation
	#Given the user is on the login page
	#When the user enters "<Username>" and "<Password>" and clicks on the Login button
	Then the user should be successfully redirected to the dashboard page
	When the user clicks on Create Quick Quote
	Then the user should be redirected to the Create Quick Quote page
	When the user selects the data in the programe "<Program>" field from the dropdown
	And the user selects the data in the product "<Product>" field from the dropdown
	Then the user selects the "Asset" value from the dropdown
	And the user enters the "Purchase Price"
	And the user enters the "Residual Value"
	Then the user selects the Frequency from the dropdown
	And the user selects the Term from the dropdown
	And the user clicks on Create Quote
	Then the user should be redirected to the Contract Details page and Add Asset Details Without VIN Number
	When the user enters Days to First Payment and clicks on the Next button
	And the user clicks on Add Contract Parties and then clicks on Add New Customer button
	Then the user clicks on the Next button
	And the user lands on the contract summary page
	Then Verify VIN Asset Error Message

Examples:
	| Username        | Password     | Program                          | Product               | Status |
	| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown       | Finance Lease         | Status : Credit Line Takedown Submitted  |
	| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown       | TRAC Lease            | Status : Credit Line Takedown Submitted     |