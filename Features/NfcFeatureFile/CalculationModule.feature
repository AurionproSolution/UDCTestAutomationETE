Feature: CalculationModule

This feature verifies the end-to-end quote calculation process. It starts with a user logging in, navigating to the Quick Quote page, selecting quote parameters, creating a quote, and finally validating that the calculated values match on both the Quick Quote and Contract Details pages.

@Sanity
Scenario Outline: Verify quote calculation from quick quote to contract details
    Given the user is on the loginpage
    When the user login with "<Username>" and "<Password>"
    Then the user should be redirect to the dashboard

    And the user navigate to the Create Quick Quote page
    When the user selects the "<Program>" from the Program dropdown
    And the user selects the "<Product>" from the Product dropdown
    And the user selects the "Asset" from the Asset dropdown
    Then user enters "Purchase Price"
    And user enters "Down Payment"
	#And user enters "Balloon"
    And user enters "Residual Value"
    And the user selects the Frequency and Term from dropdowns
    And the user click on "Create Quote"

    Then the user should be redirect to the Contract Details page
    And the calculations should match the Quick Quote and Standard Quote
    	

Examples:
	| Username          | Password       | Program                         | Product                    |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | Finance Leases Program          | Finance Lease              |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | Finance Leases Program          | TRAC Lease                 |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | Loan Program                    | Finance Included Loan      |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | FMV Program                     | Operating Lease            |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | Credit Line Lease Takedown      | Finance Lease              |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | Credit Line Lease Takedown      | Operating Lease            |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | Credit Line Lease Takedown      | TRAC Lease                 |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | Credit Line Loan Takedown       | Finance Included Loan      |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | S13 Idealease Program           | Idealease |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | UTC - 1.9% Buy Down             | Finance Included Loan      |
	| deepak.paramanick | Pramuriwondaskfhh@9898 | UTC - 1.9% Buy Down Credit Line | Finance Included Loan      |