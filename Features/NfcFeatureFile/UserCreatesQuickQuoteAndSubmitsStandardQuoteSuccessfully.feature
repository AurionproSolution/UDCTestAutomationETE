Feature: QuickQuote_SubmitStandardQuote

A short summary of the feature

@Sanity @IndividualParty
Scenario Outline: User creates Quick quote and submits a Standard quote with individual party
	Given the user is on the login page
	When the user enters "<Username>" and "<Password>" and clicks on the Login button
	Then the user should be successfully redirected to the dashboard page
	
	When the user clicks on Create Quick Quote
	Then the user should be redirected to the Create Quick Quote page
	When the user selects the data in the programe "<Program>" field from the dropdown
	And the user selects the data in the product "<Product>" field from the dropdown
	Then the user selects the "Asset" value from the dropdown
	And the user enters the "Purchase Price"
	#Then the user enters the "Down Payment"
	#And the user enters the "Balloon"
	Then the user selects the Frequency from the dropdown
	And the user selects the Term from the dropdown
	And the user clicks on Create Quote
	Then the user should be redirected to the Contract Details page
	When the user enters Days to First Payment and clicks on the Next button
	And the user clicks on Add Contract Parties and then clicks on Add New Customer button
	Then the user enters all the required fields in party details page
	Then the user clicks on Add Address Manually
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button
	And the user lands on the contract summary page
	

Examples:
	| Username          | Password       | Program                         | Product                    |
	| deepak.paramanick | Happywork@1212 | Finance Leases Program          | Finance Lease              |
	| deepak.paramanick | Happywork@1212 | Finance Leases Program          | TRAC Lease                 |
	| deepak.paramanick | Happywork@1212 | Loan Program                    | Finance Included Loan      |
	| deepak.paramanick | Happywork@1212 | FMV Program                     | Operating Lease            |
	| deepak.paramanick | Happywork@1212 | Credit Line Lease Takedown      | Finance Lease              |
	| deepak.paramanick | Happywork@1212 | Credit Line Lease Takedown      | Operating Lease            |
	| deepak.paramanick | Happywork@1212 | Credit Line Lease Takedown      | TRAC Lease                 |
	| deepak.paramanick | Happywork@1212 | Credit Line Loan Takedown       | Idealease                  |
	| deepak.paramanick | Happywork@1212 | Credit Line Loan Takedown       | Finance Included Loan      |
	| deepak.paramanick | Happywork@1212 | S13 Idealease Program           | Fixed Principal (IBI) Loan |
	| deepak.paramanick | Happywork@1212 | UTC - 1.9% Buy Down             | Finance Included Loan      |
	| deepak.paramanick | Happywork@1212 | UTC - 1.9% Buy Down Credit Line | Finance Included Loan      |


@Sanity
Scenario Outline: User creates Quick quote and submits a Standard quote with Business party
	Given the user is on the login page
	When the user enters "<Username>" and "<Password>" and clicks on the Login button
	Then the user should be successfully redirected to the dashboard page
	When the user clicks on Create Quick Quote
	Then the user should be redirected to the Create Quick Quote page
	When the user selects the data in the programe "<Program>" field from the dropdown
	And the user selects the data in the product "<Product>" field from the dropdown
	Then the user selects the "Asset" value from the dropdown
	And the user enters the "Purchase Price"
	#Then the user enters the "Down Payment"
	#And the user enters the "Balloon"
	Then the user selects the Frequency from the dropdown
	And the user selects the Term from the dropdown
	And the user clicks on Create Quote
	Then the user should be redirected to the Contract Details page
	When the user enters Days to First Payment and clicks on the Next button
	And the user clicks on Add Contract Parties and then clicks on Add New Customer button
	Then the user select Business enters all the required fields in party details page
	Then the user clicks on Add Address Manually
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button
	And the user lands on the contract summary page
	

Examples:
	| Username          | Password       | Program                         | Product                    |
	| deepak.paramanick | Happywork@1212 | Finance Leases Program          | Finance Lease              |
	| deepak.paramanick | Happywork@1212 | Finance Leases Program          | TRAC Lease                 |
	| deepak.paramanick | Happywork@1212 | Loan Program                    | Finance Included Loan      |
	| deepak.paramanick | Happywork@1212 | FMV Program                     | Operating Lease            |
	| deepak.paramanick | Happywork@1212 | Credit Line Lease Takedown      | Finance Lease              |
	| deepak.paramanick | Happywork@1212 | Credit Line Lease Takedown      | Operating Lease            |
	| deepak.paramanick | Happywork@1212 | Credit Line Lease Takedown      | TRAC Lease                 |
	| deepak.paramanick | Happywork@1212 | Credit Line Loan Takedown       | Fixed Principal (IBI) Loan |
	| deepak.paramanick | Happywork@1212 | Credit Line Loan Takedown       | Finance Included Loan      |
	| deepak.paramanick | Happywork@1212 | S13 Idealease Program           | Fixed Principal (IBI) Loan |
	| deepak.paramanick | Happywork@1212 | UTC - 1.9% Buy Down             | Finance Included Loan      |
	| deepak.paramanick | Happywork@1212 | UTC - 1.9% Buy Down Credit Line | Finance Included Loan      |

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
	Then the user clicks on Add Address Manually
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button
	And the user lands on the contract summary page


Examples:
	| Username          | Password       | Program                         | Product               |
	| deepak.paramanick | Happywork@1212 | Loan Program                    | Finance Included Loan |
	| deepak.paramanick | Happywork@1212 | Credit Line Loan Takedown       | Finance Included Loan |
	| deepak.paramanick | Happywork@1212 | UTC - 1.9% Buy Down             | Finance Included Loan |
	| deepak.paramanick | Happywork@1212 | UTC - 1.9% Buy Down Credit Line | Finance Included Loan |

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
	Then the user clicks on Add Address Manually
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button
	And the user lands on the contract summary page


Examples:
	| Username          | Password       | Program                    | Product       |
	| deepak.paramanick | Happywork@1212 | Finance Leases Program     | Finance Lease |
	| deepak.paramanick | Happywork@1212 | Finance Leases Program     | TRAC Lease    |
	| deepak.paramanick | Happywork@1212 | Credit Line Lease Takedown | Finance Lease |
	| deepak.paramanick | Happywork@1212 | Credit Line Lease Takedown | TRAC Lease    |
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
	Then the user clicks on Add Address Manually
	And on the next page, enters all the required fields in address
	Then the user clicks on the Next button
	And the user lands on the contract summary page


Examples:
	| Username          | Password       | Program                    | Product         |
	| deepak.paramanick | Happywork@1212 | FMV Program                | Operating Lease |
	| deepak.paramanick | Happywork@1212 | Credit Line Lease Takedown | Operating Lease |



@Sanity
Scenario Outline: Verify quote calculation from quick quote to contract detail
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
	And the calculation should match the Quick Quote and StandardQuote

Examples:
	| Username          | Password       | Program                   | Product               |
	| deepak.paramanick | Happywork@1212 | Loan Program              | Finance Included Loan |
	| deepak.paramanick | Happywork@1212 | Credit Line Loan Takedown | Finance Included Loan |
