Feature: StandardQuoteLoanApplicationProcess

A short summary of the feature

@tag1
Scenario: Dealer submits a loan application successfully

    Given Dealer navigates to the Login page using a URL
    When Dealer enters valid credentials
    Then Dealer successfully logs in and is redirected to the Dashboard

    When Dealer clicks on Standard Quote and navigates to the Contract Details page
    And Dealer clicks on Asset Summary, adds an asset, and saves it

    When Dealer clicks on Next after filling in all required fields
    Then Dealer navigates to the Customer page
    And Validates that a Contract ID is generated
    And Fills in the required fields, adds Customer Parties, and saves Customer details

    When Dealer navigates to the Customer Summary page
    And Clicks on Next
    Then The contract status should change to Application Submitted

    When Dealer navigates to the Dashboard page
    And Searches using the Contract ID
    Then The contract status should be Application Submitted
