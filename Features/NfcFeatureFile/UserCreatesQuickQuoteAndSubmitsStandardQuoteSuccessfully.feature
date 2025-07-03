Feature: QuickQuote_SubmitStandardQuote

A short summary of the feature

@Sanity
Scenario Outline: Loan Programs
	Given the user is on the login page
	When the user enters "<Username>" and "<Password>" and clicks on the Login button
	Then the user should be successfully redirected to the dashboard page
	When the user clicks on Create Quick Quote
	Then the user should be redirected to the Create Quick Quote page
	When the user selects the data in the programe "<Program>" field from the dropdown
	And the user selects the data in the product "<Product>" field from the dropdown
	Then the user selects the "Asset" value from the dropdown
	And the user enters the "Purchase Price"
	Then the user enters the "Down Payment"
	#And the user enters the "Balloon"
	Then the user selects the Frequency from the dropdown
	And the user selects the Term from the dropdown
	And the user clicks on Create Quote
	Then the user should be redirected to the Contract Details page
	When the user enters Days to First Payment and clicks on the Next button
	And the user clicks on Add Contract Parties and then clicks on Add New Customer button
	Then the user enters all the required fields in party details page
	#Then the user clicks on Add Address Manually
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button
	And the user lands on the contract summary page
	Then Verify Appllication Status "<Status>"


Examples:
	| Username        | Password     | Program                         | Product               | Status |
	| sandeep.bedekar | Testing@2211 | Loan Program                    | Finance Included Loan | Status : Application Submitted      |
	| sandeep.bedekar | Testing@2211 | Credit Line Loan Takedown       | Finance Included Loan | Status : Credit Line Takedown Submitted  |
	| sandeep.bedekar | Testing@2211 | IdeaLease Program              | Finance Included Loan  | Status : Credit Line Takedown Submitted     |

@Sanity
Scenario Outline: Lease Programs
	Given the user is on the login page
	When the user enters "<Username>" and "<Password>" and clicks on the Login button
	Then the user should be successfully redirected to the dashboard page
	When the user clicks on Create Quick Quote
	Then the user should be redirected to the Create Quick Quote page
	When the user selects the data in the programe "<Program>" field from the dropdown
	And the user selects the data in the product "<Product>" field from the dropdown
	Then the user selects the "Asset" value from the dropdown
	And the user enters the "Purchase Price"
	Then the user enters the "Residual Value"
	Then the user selects the Frequency from the dropdown
	And the user selects the Term from the dropdown
	And the user clicks on Create Quote
	Then the user should be redirected to the Contract Details page
	When the user enters Days to First Payment and clicks on the Next button
	And the user clicks on Add Contract Parties and then clicks on Add New Customer button
	Then the user enters all the required fields in party details page
    #Then the user clicks on Add Address Manually
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button
	And the user lands on the contract summary page
	Then Verify Appllication Status "<Status>"


Examples:
| Username          | Password       | Program                    | Product       | Status  |
| sandeep.bedekar | Testing@2211 | Finance Leases Program     | Finance Lease | Status : Application Submitted  |
| sandeep.bedekar | Testing@2211 | Finance Leases Program     | TRAC Lease    | Status : Application Submitted |
| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown | Finance Lease | Status : Credit Line Takedown Submitted |
| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown | TRAC Lease    | Status : Credit Line Takedown Submitted |

@Sanity
Scenario Outline: OperatingLease Programs
	Given the user is on the login page
	When the user enters "<Username>" and "<Password>" and clicks on the Login button
	Then the user should be successfully redirected to the dashboard page
	When the user clicks on Create Quick Quote
	Then the user should be redirected to the Create Quick Quote page
	When the user selects the data in the programe "<Program>" field from the dropdown
	And the user selects the data in the product "<Product>" field from the dropdown
	Then the user selects the "Asset" value from the dropdown
	And the user enters the "Purchase Price"
	Then the user selects the Frequency from the dropdown
	And the user selects the Term from the dropdown
	And the user clicks on Create Quote
	Then the user should be redirected to the Contract Details page
	When the user enters Days to First Payment and clicks on the Next button
	And the user clicks on Add Contract Parties and then clicks on Add New Customer button
	Then the user enters all the required fields in party details page
	#Then the user clicks on Add Address Manually
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button
	And the user lands on the contract summary page
	Then Verify Appllication Status "<Status>"


Examples:
	| Username        | Password     | Program                    | Product               | Status                                      |
	| sandeep.bedekar | Testing@2211 | FMV Program                | Operating Lease       | Status : Application Submitted              |
	| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown | Operating Lease       | Status : Credit Line Takedown Submitted     |



@Sanity
Scenario Outline: IdealLease Programs
	Given the user is on the login page
	When the user enters "<Username>" and "<Password>" and clicks on the Login button
	Then the user should be successfully redirected to the dashboard page
	When the user clicks on Create Quick Quote
	Then the user should be redirected to the Create Quick Quote page
	When the user selects the data in the programe "<Program>" field from the dropdown
	And the user selects the data in the product "<Product>" field from the dropdown
	Then the user selects the "Asset" value from the dropdown
	And the user enters the "Purchase Price"
	Then the user selects the Frequency from the dropdown
	And the user selects the Term from the dropdown
	And the user clicks on Create Quote
	Then the user should be redirected to the Contract Details page
	When the user enters Days to First Payment and clicks on the Next button
	And the user clicks on Add Contract Parties and then clicks on Add New Customer button
	Then the user enters all the required fields in party details page
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button of Customer Pager
	When the user clicks on Add Contract Parties and then clicks on Add New Customer button
	Then the user enters all the required fields in party details page for Customer Role Sublease
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button
	And the user lands on the contract summary page
	Then Verify Appllication Status "<Status>"


Examples:
	| Username        | Password     | Program                    | Product               | Status                                      |
	| sandeep.bedekar | Testing@2211 | IdeaLease Program          | Idealease             | Status : Credit Line Takedown Submitted     |



	@Sanity
Scenario Outline: Finance Leases Program and Finance Lease
	Given the user is on the login page
	When the user enters "<Username>" and "<Password>" and clicks on the Login button
	Then the user should be successfully redirected to the dashboard page
	When the user clicks on Create Quick Quote
	Then the user should be redirected to the Create Quick Quote page
	When the user selects the data in the programe "<Program>" field from the dropdown
	And the user selects the data in the product "<Product>" field from the dropdown
	Then the user selects the "Asset" value from the dropdown
	And the user enters the "Purchase Price"
	Then the user selects the Frequency from the dropdown
	And the user selects the Term from the dropdown
	And the user clicks on Create Quote
	Then the user should be redirected to the Contract Details page and Verify Validation Message for Asset Purchase Price  
	Given Add Fees and Charges 
	When Click on Calculate Button
	Then Veriy Addition of Buy Rate and Makrup is equal to Customer rate
	#Then Verify Additon of Asset cost and Add fess and charges equal to Total Amount borrowed.
	Then the Payment Summary (Installment) should match the Contract Payment Schedule section
    And the Buy Rate should be verified before contract created and after contract created
	And the user clicks on Add Contract Parties and then clicks on Add New Customer button	
	Then the user enters all the required fields in party details page
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button
	And the user lands on the contract summary page and Verify Contract Start date.First Payment date,Total Amount Borrowed,Asset Cost ,Term and Markup
	Then Verify customer added or not
	Then Verify Appllication  "<BeforeContractStatus>" before submit 
	When User click on Submit button 
	Then Verify Appllication Status "<AfterContractStatus>"




Examples:
	| Username        | Password     | Program                | Product       | AfterContractStatus            | BeforeContractStatus |
	| sandeep.bedekar | Testing@2211 | Finance Leases Program | Finance Lease | Status : Application Submitted | Status : Quote       |
