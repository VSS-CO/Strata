=begin
STRATA ARCHITECTURE & MODULE SYSTEM SPECIFICATION (Ruby Implementation)

This file documents how the module system, package manager, and deterministic
builds are implemented in Strata's Ruby target.

============================================================================
1. IMPORT RESOLUTION IN RUBY
============================================================================

Strata imports compile to Ruby requires:

Strata source:
    import io from std::io
    import util from ./util
    import http from http::client
    
    io.print("hello")

Generated Ruby code:
    require_relative "strata/stdlib/io"
    require_relative "strata/util"
    require_relative "strata/http/client"
    
    StdIo.print("hello")

============================================================================
2. NAMESPACE MAPPING
============================================================================

Strata module → Ruby module:

    std::io              → Strata::StdIo
    std::math            → Strata::StdMath
    std::text            → Strata::StdText
    ./util               → Strata::Util
    ./handlers/auth      → Strata::Handlers::Auth
    http::client         → Strata::Http::Client
    crypto::aes          → Strata::Crypto::Aes

Ruby file structure:

    lib/
    ├── strata.rb                   # Main entry point
    ├── strata/
    │  ├── stdlib/
    │  │  ├── io.rb                 # Compiled from stdlib/io.str
    │  │  ├── math.rb
    │  │  └── text.rb
    │  ├── util.rb                  # User module
    │  └── http/
    │     ├── client.rb             # Package module
    │     └── server.rb

============================================================================
3. STANDARD LIBRARY IMPLEMENTATION
============================================================================

Generated io.rb:

    module Strata
      module StdIo
        module_function
        
        def print(msg)
          Kernel.puts(msg)
        end
        
        def read
          Kernel.gets.chomp
        end
      end
    end

Generated math.rb:

    require "math"
    
    module Strata
      module StdMath
        module_function
        
        def sqrt(x)
          Math.sqrt(x)
        end
        
        def sin(x)
          Math.sin(x)
        end
        
        def cos(x)
          Math.cos(x)
        end
        
        def floor(x)
          Math.floor(x)
        end
        
        def ceil(x)
          Math.ceil(x)
        end
      end
    end

Generated text.rb:

    module Strata
      module StdText
        module_function
        
        def split(str, delimiter)
          str.split(delimiter)
        end
        
        def join(arr, separator)
          arr.join(separator)
        end
        
        def trim(str)
          str.strip
        end
      end
    end

============================================================================
4. TYPE MAPPING TO RUBY
============================================================================

Strata types → Ruby types:

    Strata int      → Ruby Integer
    Strata float    → Ruby Float
    Strata bool     → Ruby TrueClass / FalseClass
    Strata char     → Ruby String (single char)
    Strata string   → Ruby String
    Strata any      → Ruby Object (any type)

Function signatures with type hints in comments:

    # @param [Integer] a
    # @param [Integer] b
    # @return [Integer]
    def add(a, b)
      a + b
    end

============================================================================
5. RUBY-SPECIFIC FEATURES
============================================================================

Blocks and Iterators (future):

    Strata: func each(items: array, f: function) { ... }
    
    Ruby: def each(items, &block)
        items.each { |item| block.call(item) }
    end

Convention over Configuration:

    Strata modules generate standard Ruby conventions:
    • Use snake_case for method names
    • Use CamelCase for module names
    • File names match module names (io.rb → StdIo)

============================================================================
6. COMPILATION TO RUBY
============================================================================

Build process:

    1. strata build --target ruby
    2. Generate .rb files from .str modules
    3. Create lib/ directory structure
    4. (Optional) Generate Rakefile for tasks
    5. Create executable in bin/

Generated bin/my-app:

    #!/usr/bin/env ruby
    
    require_relative "../lib/strata"
    
    Strata::Main.run(ARGV)

============================================================================
7. DETERMINISTIC BUILD
============================================================================

Ruby generation is deterministic:

• Files processed in sorted order
• Consistent formatting (use RuboCop)
• No timestamps in generated code
• Hash of all .rb files to verify

Build verification:

    strata build --target ruby --verify
    # Builds twice, compares Ruby files

Format check:

    strata build --target ruby --format
    # Runs: rubocop --auto-correct lib/

============================================================================
8. PACKAGE MANAGEMENT WITH BUNDLER
============================================================================

strata.toml → Gemfile:

strata.toml:

    [project]
    name = "my-app"
    version = "1.0.0"
    ruby = ">=2.7"
    
    [dependencies]
    http = "1.2.0"
    crypto = ">=2.0.0,<3.0"

Generated Gemfile:

    source "https://rubygems.org"
    
    gem "strata-http", "1.2.0"
    gem "strata-crypto", ">= 2.0.0", "< 3.0"

strata.lock includes:

    [[packages]]
    name = "http"
    version = "1.2.0"
    gem = "strata-http"
    hash = "sha256:abc123..."

Install during build:

    strata build --target ruby
    # Runs: bundle install

============================================================================
9. RUNTIME EXECUTION
============================================================================

Run Strata program:

    strata run main.str [args...]
    # Generates main.rb, runs: ruby main.rb

IRB REPL (Ruby interactive):

    strata repl --target ruby
    # Loads Strata modules in IRB

Testing:

    strata test --target ruby
    # Runs tests with: bundle exec rake test

============================================================================
10. PACKAGING & DISTRIBUTION
============================================================================

Create Ruby gem:

    strata package --target ruby
    # Generates: pkg/my-app-1.0.0.gem

Generate gemspec:

    strata publish --target ruby --gemspec
    # Creates my-app.gemspec

Publish to RubyGems (future):

    strata publish --target ruby --gem-key $RUBYGEMS_KEY
    # Uploads to RubyGems.org

============================================================================
=end

# Standard Library: IO

module Strata
  module StdIo
    module_function
    
    def print(msg)
      Kernel.puts(msg)
    end
    
    def read
      Kernel.gets.chomp
    end
  end
end

# Standard Library: Math

module Strata
  module StdMath
    module_function
    
    def sqrt(x)
      Math.sqrt(x)
    end
    
    def sin(x)
      Math.sin(x)
    end
    
    def cos(x)
      Math.cos(x)
    end
    
    def floor(x)
      Math.floor(x)
    end
    
    def ceil(x)
      Math.ceil(x)
    end
  end
end

# Standard Library: Text

module Strata
  module StdText
    module_function
    
    def split(str, delimiter)
      str.split(delimiter)
    end
    
    def join(arr, separator)
      arr.join(separator)
    end
    
    def trim(str)
      str.strip
    end
  end
end

# User code: Main

module Strata
  class Main
    def self.run(argv = [])
      # import io from std::io
      StdIo.print("Hello, World!")
      
      # import math from std::math
      x = StdMath.sqrt(16.0)
      
      # import text from std::text
      result = x.to_s
      StdIo.print(result)
    end
  end
end

# Run main if executed directly
Strata::Main.run(ARGV) if __FILE__ == $0
