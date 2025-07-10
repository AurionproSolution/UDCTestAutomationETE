Feature: Quick Quote Creation and Validation

@Sanity
  Scenario Outline: User creates a quick quote and validates mandatory fields
    #Given  user is on the login page
    #When  user logs in with "<Username>" and "<Password>"
    Then  user should be redirected to the dashboard
    When  user navigates to the Create Quick Quote page
    Then user should be redirected to the Create Quick Quote page
    When  user selects "<Program>" from the Program dropdown
    And  user selects "<Product>" from the Product dropdown
    And  user selects "Asset" from the Asset dropdown
    And  user clicks on the Calculate button
    Then a validation message should be displayed for mandatory fields
    When the user selects Frequency and clicks on the Calculate button
    Then a validation message should be displayed for mandatory fields
    When the user selects Term in Months and clicks on the Calculate button
    Then a validation message should be displayed for mandatory fields
    When the user enters Purchase Price and selects a term greater than 84 months
    Then a validation message should be displayed for term selection
    When the user selects a valid Term from the dropdown and clicks on the Calculate button
    And the user clicks on the Create Quote button
    Then the Purchase Price and Asset Cost should be the same on the Contract Details page

    	

Examples:
	| Username        | Password     | Program                         | Product                    |
	| sandeep.bedekar | Testing@2211 | Finance Leases Program          | Finance Lease              |
	| sandeep.bedekar | Testing@2211 | Finance Leases Program          | TRAC Lease                 |
	| sandeep.bedekar | Testing@2211 | Loan Program                    | Finance Included Loan      |
	| sandeep.bedekar | Testing@2211 | FMV Program                     | Operating Lease            |
	| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown      | Finance Lease              |
	| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown      | Operating Lease            |
	| sandeep.bedekar | Testing@2211 | Credit Line Lease Takedown      | TRAC Lease                 |
	| sandeep.bedekar | Testing@2211 | Credit Line Loan Takedown       | Finance Included Loan      |
    | sandeep.bedekar | Testing@2211 | IdeaLease Program               | Finance Included Loan      |
    | sandeep.bedekar | Testing@2211 | IdeaLease Program               | Idealease                  |